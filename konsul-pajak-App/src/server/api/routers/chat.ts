import { TRPCError } from '@trpc/server';
import { z } from 'zod';

import { answerTaxQuestion, type SourceCitation } from 'nvn/server/ai/chat-agent';
import { createTRPCRouter, protectedProcedure, publicProcedure } from 'nvn/server/api/trpc';

const chatIdInput = z.object({
  chatId: z.string().uuid(),
});

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

// ---------------------------------------------------------------------------
// Helper: Detect spam and compute credit cost
// ---------------------------------------------------------------------------
async function computeCreditCost(
  db: any,
  userId: string,
  message: string,
  chatId: string,
  quotaConfig: Awaited<ReturnType<typeof getQuotaConfig>>,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      lastMessageAt: true,
      spamStreak: true,
      creditCostPerMsg: true,
      isFlagged: true,
    },
  });

  if (!user) return { cost: 1, isSpam: false };

  // If user is flagged by admin, always cost 3
  if (user.isFlagged) {
    return { cost: 3, isSpam: true };
  }

  let isSpam = false;

  // Check 1: Time-based spam (messages too fast)
  if (user.lastMessageAt) {
    const timeSinceLastMsg = (Date.now() - new Date(user.lastMessageAt).getTime()) / 1000;
    if (timeSinceLastMsg < quotaConfig.spamTimeWindowSec) {
      isSpam = true;
    }
  }

  // Check 2: Message too short
  if (message.trim().length < quotaConfig.minMessageLength) {
    isSpam = true;
  }

  // Check 3: Repeated message (same as last message)
  if (!isSpam) {
    const lastMessage = await db.message.findFirst({
      where: { chat: { userId }, role: 'user' },
      orderBy: { createdAt: 'desc' },
      select: { content: true },
    });
    if (lastMessage && lastMessage.content.trim().toLowerCase() === message.trim().toLowerCase()) {
      isSpam = true;
    }
  }

  // Calculate cost based on spam streak
  let newSpamStreak = isSpam ? user.spamStreak + 1 : 0;
  let cost = 1;

  if (isSpam) {
    // Escalating cost: 2 → 3 → 4 (capped at 4)
    cost = Math.min(2 + Math.floor(newSpamStreak / 2), 4);
  }

  // Update user's spam tracking
  await db.user.update({
    where: { id: userId },
    data: {
      lastMessageAt: new Date(),
      spamStreak: newSpamStreak,
      creditCostPerMsg: cost,
    },
  });

  return { cost, isSpam };
}

export const chatRouter = createTRPCRouter({
  // ─── Credit Info (for logged-in users) ─────────────────
  getCredits: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.user.findUnique({
      where: { id: ctx.session.user.id },
      select: {
        credits: true,
        creditCostPerMsg: true,
        isFlagged: true,
        spamStreak: true,
      },
    });

    return {
      credits: user?.credits ?? 0,
      creditCostPerMsg: user?.creditCostPerMsg ?? 1,
      isFlagged: user?.isFlagged ?? false,
    };
  }),

  // ─── Guest Message (no auth required, single-turn, no DB save) ─────
  guestMessage: publicProcedure
    .input(
      z.object({
        message: z.string().min(1, 'Pesan tidak boleh kosong').max(2000, 'Pesan terlalu panjang'),
      }),
    )
    .mutation(async ({ input }) => {
      const trimmedMessage = input.message.trim();

      // Call AI without any history (single-turn)
      const { answer, sources } = await answerTaxQuestion(trimmedMessage, []);

      return {
        answer,
        sources,
      };
    }),

  // ─── Chat History ──────────────────────────────────────
  history: protectedProcedure.query(async ({ ctx }) => {
    const chats = await ctx.db.chat.findMany({
      where: { userId: ctx.session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return chats;
  }),

  // ─── Chat Messages ────────────────────────────────────
  messages: protectedProcedure.input(chatIdInput).query(async ({ ctx, input }) => {
    const chat = await ctx.db.chat.findFirst({
      where: {
        id: input.chatId,
        userId: ctx.session.user.id,
      },
    });

    if (!chat) {
      throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
    }

    const messages = await ctx.db.message.findMany({
      where: { chatId: chat.id },
      orderBy: { createdAt: 'asc' },
      include: {
        feedback: true, // Include feedback data
      },
    });

    return messages.map((msg) => ({
      id: msg.id,
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      createdAt: msg.createdAt,
      sources: (msg.sources ?? undefined) as SourceCitation[] | undefined,
      feedback: msg.feedback ? { rating: msg.feedback.rating as 'suka' | 'tidak_suka' } : null,
    }));
  }),

  // ─── Create Chat ──────────────────────────────────────
  create: protectedProcedure.mutation(async ({ ctx }) => {
    const chat = await ctx.db.chat.create({
      data: {
        userId: ctx.session.user.id,
      },
    });

    return chat;
  }),

  // ─── Send Message (with credit check + spam detection) ─
  sendMessage: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        message: z.string().min(1, 'Pesan tidak boleh kosong').max(2000, 'Pesan terlalu panjang'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: { id: input.chatId, userId: ctx.session.user.id },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      const trimmedMessage = input.message.trim();

      // ── Credit check ──────────────────────────────────
      const user = await ctx.db.user.findUnique({
        where: { id: ctx.session.user.id },
        select: { credits: true },
      });

      if (!user || user.credits <= 0) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Kredit pesan Anda telah habis. Silakan hubungi administrator.',
        });
      }

      // ── Spam detection + cost calculation ──────────────
      const quotaConfig = await getQuotaConfig(ctx.db);
      const { cost } = await computeCreditCost(
        ctx.db,
        ctx.session.user.id,
        trimmedMessage,
        input.chatId,
        quotaConfig,
      );

      // Deduct credits
      const newCredits = Math.max(0, user.credits - cost);
      await ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: { credits: newCredits },
      });

      // ── Existing logic: fetch history, send to AI, save ──
      const recentMessages = await ctx.db.message.findMany({
        where: { chatId: chat.id },
        orderBy: { createdAt: 'asc' },
        take: 10,
        select: {
          role: true,
          content: true,
        },
      });

      const userMessage = await ctx.db.message.create({
        data: {
          chatId: chat.id,
          role: 'user',
          content: trimmedMessage,
        },
      });

      if (chat.title === 'Percakapan Baru') {
        await ctx.db.chat.update({
          where: { id: chat.id },
          data: { title: trimmedMessage.slice(0, 60) },
        });
      }

      const messageHistory = recentMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      const { answer, sources } = await answerTaxQuestion(trimmedMessage, messageHistory);

      // Augment sources with URLs from Peraturan table
      const augmentedSources = await Promise.all(
        sources.map(async (src) => {
          let searchStr = src.source;
          const numMatch = src.source.match(/Nomor\s+(\d+\s+TAHUN\s+\d+)/i) || src.source.match(/No\.?\s+(\d+\s+TAHUN\s+\d+)/i);
          if (numMatch && numMatch[1]) {
            searchStr = numMatch[1];
          }

          const peraturan = await ctx.db.peraturan.findFirst({
            where: {
              OR: [
                { nomor: { contains: searchStr, mode: 'insensitive' } },
                { title: { contains: searchStr, mode: 'insensitive' } },
              ],
            },
            select: { url: true },
          });

          return {
            ...src,
            url: peraturan?.url ?? undefined,
          };
        })
      );

      const assistantMessage = await ctx.db.message.create({
        data: {
          chatId: chat.id,
          role: 'assistant',
          content: answer,
          sources: augmentedSources,
        },
      });

      return {
        userMessage: {
          id: userMessage.id,
          role: 'user' as const,
          content: userMessage.content,
          createdAt: userMessage.createdAt,
        },
        assistantMessage: {
          id: assistantMessage.id,
          role: 'assistant' as const,
          content: assistantMessage.content,
          createdAt: assistantMessage.createdAt,
          sources,
        },
        creditsRemaining: newCredits,
        creditCost: cost,
      };
    }),

  // ─── Feedback ─────────────────────────────────────────
  submitFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.number().int().positive(),
        rating: z.enum(['suka', 'tidak_suka']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          chat: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pesan tidak ditemukan' });
      }

      const feedback = await ctx.db.feedback.upsert({
        where: { messageId: message.id },
        create: {
          messageId: message.id,
          userId: ctx.session.user.id,
          rating: input.rating,
        },
        update: {
          rating: input.rating,
        },
      });

      return feedback;
    }),

  deleteFeedback: protectedProcedure
    .input(
      z.object({
        messageId: z.number().int().positive(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const message = await ctx.db.message.findFirst({
        where: {
          id: input.messageId,
          chat: {
            userId: ctx.session.user.id,
          },
        },
      });

      if (!message) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Pesan tidak ditemukan' });
      }

      await ctx.db.feedback.deleteMany({
        where: {
          messageId: message.id,
          userId: ctx.session.user.id,
        },
      });

      return { success: true };
    }),

  // ─── Chat Management ─────────────────────────────────
  deleteChat: protectedProcedure
    .input(chatIdInput)
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: {
          id: input.chatId,
          userId: ctx.session.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      await ctx.db.message.deleteMany({
        where: { chatId: chat.id },
      });

      await ctx.db.chat.delete({
        where: { id: chat.id },
      });

      return { success: true };
    }),

  renameChat: protectedProcedure
    .input(
      z.object({
        chatId: z.string().uuid(),
        title: z.string().min(1, 'Judul tidak boleh kosong').max(100, 'Judul terlalu panjang'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findFirst({
        where: {
          id: input.chatId,
          userId: ctx.session.user.id,
        },
      });

      if (!chat) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Chat tidak ditemukan' });
      }

      const updatedChat = await ctx.db.chat.update({
        where: { id: chat.id },
        data: { title: input.title.trim() },
      });

      return updatedChat;
    }),

  // ─── Reports ──────────────────────────────────────────
  submitReport: protectedProcedure
    .input(
      z.object({
        messageId: z.number().int().positive().optional(),
        content: z.string().min(1, 'Pesan tidak boleh kosong').max(2000, 'Pesan terlalu panjang'),
        type: z.enum(['saran', 'kesalahan']),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.messageId) {
        const message = await ctx.db.message.findFirst({
          where: {
            id: input.messageId,
            chat: {
              userId: ctx.session.user.id,
            },
          },
        });

        if (!message) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Pesan tidak ditemukan' });
        }
      }

      const report = await ctx.db.report.create({
        data: {
          userId: ctx.session.user.id,
          messageId: input.messageId,
          content: input.content,
          type: input.type,
        },
      });

      return report;
    }),
});
