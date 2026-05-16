import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createTRPCRouter, publicProcedure, t } from "nvn/server/api/trpc";

// Simple token: base64 of "admin:<id>:<timestamp>"
function generateToken(adminId: number): string {
  return Buffer.from(`admin:${adminId}:${Date.now()}`).toString("base64");
}

const COOKIE_NAME = "admin_session";

// Parse a specific cookie from the raw Cookie header string
function parseCookie(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.split(";").find((c) => c.trim().startsWith(`${name}=`));
  return match ? match.split("=").slice(1).join("=").trim() : undefined;
}

// Admin middleware — checks cookie from request headers
const adminMiddleware = t.middleware(async ({ ctx, next }) => {
  const cookieHeader = ctx.headers.get("cookie");
  const token = parseCookie(cookieHeader, COOKIE_NAME);

  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Silakan login terlebih dahulu." });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const [prefix, idStr] = decoded.split(":");
    if (prefix !== "admin" || !idStr) throw new Error();

    const admin = await ctx.db.admin.findUnique({ where: { id: parseInt(idStr) } });
    if (!admin) throw new Error();

    return next({ ctx: { ...ctx, admin } });
  } catch {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sesi tidak valid." });
  }
});

const adminProcedure = t.procedure.use(adminMiddleware);

export const adminRouter = createTRPCRouter({
  // ─── Auth ──────────────────────────────────────────
  login: publicProcedure
    .input(z.object({ username: z.string(), password: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const admin = await ctx.db.admin.findUnique({ where: { username: input.username } });
      if (!admin) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Username atau password salah." });
      }

      const valid = await bcrypt.compare(input.password, admin.password_hash);
      if (!valid) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Username atau password salah." });
      }

      const token = generateToken(admin.id);
      return { success: true, token };
    }),

  logout: publicProcedure.mutation(() => {
    return { success: true };
  }),

  checkAuth: adminProcedure.query(() => ({ authenticated: true })),

  // ─── Dashboard Stats ──────────────────────────────
  stats: adminProcedure.query(async ({ ctx }) => {
    const [users, chats, messages, feedbackSuka, feedbackTidakSuka, peraturan] =
      await Promise.all([
        ctx.db.user.count(),
        ctx.db.chat.count(),
        ctx.db.message.count(),
        ctx.db.feedback.count({ where: { rating: "suka" } }),
        ctx.db.feedback.count({ where: { rating: "tidak_suka" } }),
        ctx.db.peraturan.count(),
      ]);

    return { users, chats, messages, feedbackSuka, feedbackTidakSuka, peraturan };
  }),

  // ─── Users ─────────────────────────────────────────
  users: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;

      const [items, total] = await Promise.all([
        ctx.db.user.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { id: "desc" },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            _count: { select: { chats: true, feedbacks: true } },
          },
        }),
        ctx.db.user.count(),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  // ─── Chats ─────────────────────────────────────────
  chats: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;

      const [items, total] = await Promise.all([
        ctx.db.chat.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            _count: { select: { messages: true } },
          },
        }),
        ctx.db.chat.count(),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  chatDetail: adminProcedure
    .input(z.object({ chatId: z.string() }))
    .query(async ({ ctx, input }) => {
      const chat = await ctx.db.chat.findUnique({
        where: { id: input.chatId },
        select: {
          id: true,
          title: true,
          createdAt: true,
          user: { select: { name: true, email: true } },
          messages: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              role: true,
              content: true,
              createdAt: true,
              feedback: { select: { rating: true } },
            },
          },
        },
      });

      if (!chat) throw new TRPCError({ code: "NOT_FOUND" });
      return chat;
    }),

  // ─── Feedback ──────────────────────────────────────
  feedback: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(10),
        rating: z.enum(["suka", "tidak_suka"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const where = input?.rating ? { rating: input.rating } : {};

      const [items, total] = await Promise.all([
        ctx.db.feedback.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            rating: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            message: {
              select: {
                content: true,
                chat: { select: { messages: { where: { role: "user" }, orderBy: { createdAt: "desc" }, take: 1, select: { content: true } } } },
              },
            },
          },
        }),
        ctx.db.feedback.count({ where }),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  // ─── Laporan (Reports) ───────────────────────────────
  reports: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(10),
        type: z.enum(["saran", "kesalahan"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const where = input?.type ? { type: input.type } : {};

      const [items, total] = await Promise.all([
        ctx.db.report.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            type: true,
            content: true,
            createdAt: true,
            user: { select: { name: true, email: true } },
            message: {
              select: { content: true } // Context of what they were reporting, if attached to a message
            }
          },
        }),
        ctx.db.report.count({ where }),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  // ─── Peraturan CRUD ────────────────────────────────
  peraturanList: adminProcedure
    .input(z.object({ page: z.number().min(1).default(1), limit: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;

      const [items, total] = await Promise.all([
        ctx.db.peraturan.findMany({
          skip: (page - 1) * limit,
          take: limit,
          orderBy: [{ tahun: "desc" }, { nomor: "asc" }],
        }),
        ctx.db.peraturan.count(),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  peraturanUpsert: adminProcedure
    .input(
      z.object({
        id: z.number().optional(), // if provided, update; else create
        title: z.string(),
        nomor: z.string(),
        jenis: z.string(),
        topik: z.string(),
        tahun: z.string(),
        status: z.string(),
        deskripsi: z.string().default(""),
        url: z.string().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (id) {
        return ctx.db.peraturan.update({ where: { id }, data });
      }
      return ctx.db.peraturan.create({ data });
    }),

  peraturanDelete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.peraturan.delete({ where: { id: input.id } });
    }),

  // ─── Quota Management ─────────────────────────────────

  quotaConfig: adminProcedure.query(async ({ ctx }) => {
    // Upsert: create default config if it doesn't exist
    const config = await ctx.db.quotaConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return config;
  }),

  updateQuotaConfig: adminProcedure
    .input(
      z.object({
        defaultCredits: z.number().min(1).max(10000),
        guestMessageLimit: z.number().min(0).max(10),
        spamTimeWindowSec: z.number().min(5).max(300),
        minMessageLength: z.number().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.quotaConfig.upsert({
        where: { id: 1 },
        create: { id: 1, ...input },
        update: input,
      });
    }),

  userCredits: adminProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().default(10),
        flaggedOnly: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const where = input?.flaggedOnly ? { isFlagged: true } : {};

      const [items, total] = await Promise.all([
        ctx.db.user.findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { credits: "asc" },
          select: {
            id: true,
            name: true,
            email: true,
            credits: true,
            creditCostPerMsg: true,
            isFlagged: true,
            spamStreak: true,
            lastMessageAt: true,
            _count: { select: { chats: true } },
          },
        }),
        ctx.db.user.count({ where }),
      ]);

      return { items, total, totalPages: Math.ceil(total / limit), page };
    }),

  adjustUserCredits: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        credits: z.number().min(0).max(10000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { credits: input.credits },
      });
    }),

  toggleUserFlag: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const user = await ctx.db.user.findUnique({ where: { id: input.userId } });
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          isFlagged: !user.isFlagged,
          // When flagging, force cost to 3; when unflagging, reset to 1
          creditCostPerMsg: user.isFlagged ? 1 : 3,
        },
      });
    }),

  resetUserQuota: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const config = await ctx.db.quotaConfig.findFirst({ where: { id: 1 } });
      const defaultCredits = config?.defaultCredits ?? 100;

      return ctx.db.user.update({
        where: { id: input.userId },
        data: {
          credits: defaultCredits,
          creditCostPerMsg: 1,
          spamStreak: 0,
          isFlagged: false,
        },
      });
    }),
});
