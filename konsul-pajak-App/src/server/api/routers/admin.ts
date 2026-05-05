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

// Admin middleware — checks cookie against Admin table
const adminMiddleware = t.middleware(async ({ ctx, next }) => {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

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
      const cookieStore = await cookies();
      cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24, // 1 day
      });

      return { success: true };
    }),

  logout: adminProcedure.mutation(async () => {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
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
});
