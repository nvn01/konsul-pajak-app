import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { createTRPCRouter, publicProcedure, t } from "nvn/server/api/trpc";
import {
  ADMIN_COOKIE_NAME,
  ADMIN_COOKIE_OPTIONS,
  generateAdminToken,
} from "nvn/server/admin-auth";

// Admin middleware — checks cookie
const adminMiddleware = t.middleware(async ({ ctx, next }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;

  if (!token) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Silakan login terlebih dahulu." });
  }

  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");
    if (parts.length < 2 || parts[0] !== "admin") throw new Error();

    const idStr = parts[1];
    if (!idStr) throw new Error();

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

      const token = generateAdminToken(admin.id);

      // Set secure HTTP-only cookie server-side
      ctx.setCookies.push({
        name: ADMIN_COOKIE_NAME,
        value: token,
        options: ADMIN_COOKIE_OPTIONS,
      });

      return { success: true };
    }),

  logout: publicProcedure.mutation(async ({ ctx }) => {
    ctx.setCookies.push({
      name: ADMIN_COOKIE_NAME,
      value: "",
      options: {
        ...ADMIN_COOKIE_OPTIONS,
        maxAge: 0,
        expires: new Date(0),
      },
    });
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
    try {
      await ctx.db.$executeRawUnsafe(
        `ALTER TABLE "QuotaConfig" ADD COLUMN IF NOT EXISTS "guestConversationLimit" INTEGER NOT NULL DEFAULT 1;`
      );
    } catch {
      // Ignore if column already exists
    }
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
        guestConversationLimit: z.number().min(0).max(1000),
        guestMessageLimit: z.number().min(0).max(1000),
        spamTimeWindowSec: z.number().min(5).max(300),
        minMessageLength: z.number().min(1).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        await ctx.db.$executeRawUnsafe(
          `ALTER TABLE "QuotaConfig" ADD COLUMN IF NOT EXISTS "guestConversationLimit" INTEGER NOT NULL DEFAULT 1;`
        );
      } catch {
        // Ignore if column already exists
      }
      // Clear previous guest usage records so updated guest limits take effect cleanly
      await ctx.db.guestUsage.deleteMany({});
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
      const defaultCredits = config?.defaultCredits ?? 20;

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

  guestBlockedIps: adminProcedure
    .input(
      z
        .object({
          page: z.number().min(1).default(1),
          limit: z.number().default(10),
          blockedOnly: z.boolean().default(false),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      try {
        await ctx.db.$executeRawUnsafe(
          `ALTER TABLE "QuotaConfig" ADD COLUMN IF NOT EXISTS "guestConversationLimit" INTEGER NOT NULL DEFAULT 1;`,
        );
      } catch {
        // Ignore if column already exists
      }

      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;
      const blockedOnly = input?.blockedOnly ?? false;

      const [config, allUsages] = await Promise.all([
        ctx.db.quotaConfig.findFirst({ where: { id: 1 } }),
        ctx.db.guestUsage.findMany({
          orderBy: { createdAt: "desc" },
        }),
      ]);

      const guestConversationLimit = config?.guestConversationLimit ?? 1;
      const guestMessageLimit = config?.guestMessageLimit ?? 5;

      const ipMap = new Map<
        string,
        {
          ip: string;
          conversations: Map<string, number>;
          totalChatMessages: number;
          calculationsUsed: number;
          lastActiveAt: Date;
        }
      >();

      for (const usage of allUsages) {
        let entry = ipMap.get(usage.ip);
        if (!entry) {
          entry = {
            ip: usage.ip,
            conversations: new Map<string, number>(),
            totalChatMessages: 0,
            calculationsUsed: 0,
            lastActiveAt: usage.createdAt,
          };
          ipMap.set(usage.ip, entry);
        }

        if (usage.createdAt > entry.lastActiveAt) {
          entry.lastActiveAt = usage.createdAt;
        }

        if (usage.actionType === "calculation") {
          entry.calculationsUsed += 1;
        } else if (usage.actionType.startsWith("chat")) {
          entry.totalChatMessages += 1;
          const convKey =
            usage.actionType === "chat" ? `legacy:${usage.id}` : usage.actionType;
          entry.conversations.set(
            convKey,
            (entry.conversations.get(convKey) ?? 0) + 1,
          );
        }
      }

      const aggregated = Array.from(ipMap.values()).map((entry) => {
        const conversationsUsed = entry.conversations.size;
        const maxMessagesInConv =
          entry.conversations.size > 0
            ? Math.max(...Array.from(entry.conversations.values()))
            : 0;

        const blockReasons: string[] = [];
        if (conversationsUsed >= guestConversationLimit) {
          blockReasons.push("Batas Percakapan");
        }
        if (maxMessagesInConv >= guestMessageLimit) {
          blockReasons.push("Batas Pesan");
        }
        if (entry.calculationsUsed >= guestConversationLimit) {
          blockReasons.push("Batas Kalkulator");
        }

        const isBlocked = blockReasons.length > 0;

        return {
          ip: entry.ip,
          conversationsUsed,
          totalChatMessages: entry.totalChatMessages,
          maxMessagesInConv,
          calculationsUsed: entry.calculationsUsed,
          lastActiveAt: entry.lastActiveAt,
          isBlocked,
          blockReasons,
        };
      });

      const filtered = blockedOnly
        ? aggregated.filter((item) => item.isBlocked)
        : aggregated;

      filtered.sort((a, b) => {
        if (a.isBlocked !== b.isBlocked) {
          return a.isBlocked ? -1 : 1;
        }
        return b.lastActiveAt.getTime() - a.lastActiveAt.getTime();
      });

      const total = filtered.length;
      const totalPages = Math.max(1, Math.ceil(total / limit));
      const items = filtered.slice((page - 1) * limit, page * limit);

      return {
        items,
        total,
        totalPages,
        page,
        guestConversationLimit,
        guestMessageLimit,
      };
    }),

  unblockGuestIp: adminProcedure
    .input(z.object({ ip: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.guestUsage.deleteMany({
        where: { ip: input.ip },
      });
      return { success: true };
    }),

  resetAllGuestIps: adminProcedure.mutation(async ({ ctx }) => {
    await ctx.db.guestUsage.deleteMany({});
    return { success: true };
  }),
});
