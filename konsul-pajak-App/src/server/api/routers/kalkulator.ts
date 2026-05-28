import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { calculateTax, type TaxCalculationResult } from 'nvn/server/ai/calculator-agent';
import type { SourceCitation } from 'nvn/server/ai/chat-agent';
import { createTRPCRouter, protectedProcedure, publicProcedure } from 'nvn/server/api/trpc';

// ---------------------------------------------------------------------------
// Helper: Load quota config (singleton) with fallback defaults
// ---------------------------------------------------------------------------
async function getQuotaConfig(db: any) {
  const config = await db.quotaConfig.findFirst({ where: { id: 1 } });
  return {
    defaultCredits: config?.defaultCredits ?? 100,
    guestMessageLimit: config?.guestMessageLimit ?? 1,
    spamTimeWindowSec: config?.spamTimeWindowSec ?? 30,
    minMessageLength: config?.minMessageLength ?? 10,
  };
}

export const kalkulatorRouter = createTRPCRouter({
  // ─── Guest Calculate (no auth required, single-use, no DB save) ────
  guestCalculate: publicProcedure
    .input(
      z.object({
        description: z
          .string()
          .min(10, 'Deskripsi terlalu pendek (minimal 10 karakter)')
          .max(3000, 'Deskripsi terlalu panjang'),
      }),
    )
    .mutation(async ({ input }) => {
      const result = await calculateTax(input.description.trim());

      // Guest: no DB save, no source augmentation (no DB context)
      return result;
    }),

  // ─── Calculate (with auth, credit check, save to history) ──────────
  calculate: protectedProcedure
    .input(
      z.object({
        description: z
          .string()
          .min(10, 'Deskripsi terlalu pendek (minimal 10 karakter)')
          .max(3000, 'Deskripsi terlalu panjang'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const trimmedDescription = input.description.trim();

      // ── Credit check ──────────────────────────────────
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: {
          credits: true,
          lastMessageAt: true,
          spamStreak: true,
          isFlagged: true,
        },
      });

      if (!user || user.credits <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Kredit Anda telah habis. Silakan hubungi administrator.',
        });
      }

      // ── Simple spam detection for calculator ──────────
      const quotaConfig = await getQuotaConfig(ctx.db);
      let cost = 1;
      let isSpam = false;

      // Check time-based spam
      if (user.lastMessageAt) {
        const timeSinceLastMsg =
          (Date.now() - new Date(user.lastMessageAt).getTime()) / 1000;
        if (timeSinceLastMsg < quotaConfig.spamTimeWindowSec) {
          isSpam = true;
        }
      }

      // Check too short
      if (trimmedDescription.length < quotaConfig.minMessageLength) {
        isSpam = true;
      }

      if (user.isFlagged) {
        cost = 3;
      } else if (isSpam) {
        const newSpamStreak = user.spamStreak + 1;
        cost = Math.min(2 + Math.floor(newSpamStreak / 2), 4);
      }

      // Deduct credits
      const newCredits = Math.max(0, user.credits - cost);
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          credits: newCredits,
          lastMessageAt: new Date(),
          spamStreak: isSpam ? user.spamStreak + 1 : 0,
          creditCostPerMsg: cost,
        },
      });

      // ── Call AI calculator ────────────────────────────
      const result = await calculateTax(trimmedDescription);

      // ── Augment sources with Peraturan URLs ───────────
      const augmentedDasarHukum: SourceCitation[] = await Promise.all(
        result.dasarHukum.map(async (src) => {
          // Strategy 1: Try exact "Nomor X TAHUN Y" pattern
          const numMatch =
            src.source.match(/Nomor\s+(\d+\s+TAHUN\s+\d+)/i) ||
            src.source.match(/No\.?\s+(\d+\s+TAHUN\s+\d+)/i);

          if (numMatch && numMatch[1]) {
            const peraturan = await ctx.db.peraturan.findFirst({
              where: {
                OR: [
                  { nomor: { contains: numMatch[1], mode: 'insensitive' } },
                  { title: { contains: numMatch[1], mode: 'insensitive' } },
                ],
              },
              select: { url: true },
            });
            if (peraturan?.url) {
              return { ...src, url: peraturan.url };
            }
          }

          // Strategy 2: Try type+number pattern (PP 55/2022, PMK 168/2023, SE-5/PJ/2024, etc.)
          const typeNumMatch = src.source.match(
            /(?:PP|PMK|SE|PER|Perpres|Peraturan\s+Pemerintah|Peraturan\s+Menteri\s+Keuangan|Surat\s+Edaran)[- ]*(?:Nomor\s*)?(\d[\w/.-]*(?:\s*(?:Tahun|\/)\s*\d{4})?)/i
          );
          if (typeNumMatch && typeNumMatch[1]) {
            const searchNum = typeNumMatch[1].replace(/\s+/g, ' ').trim();
            const peraturan = await ctx.db.peraturan.findFirst({
              where: {
                OR: [
                  { nomor: { contains: searchNum, mode: 'insensitive' } },
                  { title: { contains: searchNum, mode: 'insensitive' } },
                ],
              },
              select: { url: true },
            });
            if (peraturan?.url) {
              return { ...src, url: peraturan.url };
            }
          }

          // Strategy 3: Broad keyword search — extract meaningful words from source name
          // Remove generic words and search across title + deskripsi
          const cleanedSource = src.source
            .replace(/(?:Pasal|Ayat|huruf|angka|jo\.?|dan|atau|tentang)\s*/gi, ' ')
            .replace(/[(),.:;""'"]/g, ' ')
            .trim();
          // Extract year if present
          const yearMatch = cleanedSource.match(/\b(19|20)\d{2}\b/);
          // Extract the regulation number
          const broadNumMatch = cleanedSource.match(/\b(\d+)\b/);

          if (yearMatch && broadNumMatch) {
            const peraturan = await ctx.db.peraturan.findFirst({
              where: {
                AND: [
                  { tahun: yearMatch[0] },
                  {
                    OR: [
                      { nomor: { contains: broadNumMatch[1], mode: 'insensitive' } },
                      { title: { contains: cleanedSource.substring(0, 60), mode: 'insensitive' } },
                    ],
                  },
                ],
              },
              select: { url: true },
            });
            if (peraturan?.url) {
              return { ...src, url: peraturan.url };
            }
          }

          // Strategy 4: Last resort — full-text search on the raw source string
          const peraturanFallback = await ctx.db.peraturan.findFirst({
            where: {
              OR: [
                { title: { contains: src.source.substring(0, 80), mode: 'insensitive' } },
                { deskripsi: { contains: src.source.substring(0, 80), mode: 'insensitive' } },
              ],
            },
            select: { url: true },
          });
          if (peraturanFallback?.url) {
            return { ...src, url: peraturanFallback.url };
          }

          return { ...src, url: undefined };
        }),
      );

      const augmentedResult: TaxCalculationResult = {
        ...result,
        dasarHukum: augmentedDasarHukum,
      };

      // ── Save to calculation history ───────────────────
      await ctx.db.calculation.create({
        data: {
          userId: ctx.session.user.id,
          inputText: trimmedDescription,
          kategori: augmentedResult.kategori,
          subKategori: augmentedResult.subKategori || null,
          dpp: augmentedResult.dpp,
          pajakTerutang: augmentedResult.pajakTerutang,
          resultJson: augmentedResult as any,
        },
      });

      return {
        result: augmentedResult,
        creditsRemaining: newCredits,
        creditCost: cost,
      };
    }),

  // ─── Get calculation history (auth only) ───────────────────────────
  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const calculations = await ctx.db.calculation.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        inputText: true,
        kategori: true,
        subKategori: true,
        dpp: true,
        pajakTerutang: true,
        resultJson: true,
        createdAt: true,
      },
    });
    return calculations;
  }),
});

