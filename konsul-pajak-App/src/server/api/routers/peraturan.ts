import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "nvn/server/api/trpc";

export const peraturanRouter = createTRPCRouter({
  list: publicProcedure
    .input(
      z.object({
        jenis: z.string().optional(),
        topik: z.string().optional(),
        status: z.string().optional(),
        tahun: z.string().optional(),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(50).default(10),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};
      const page = input?.page ?? 1;
      const limit = input?.limit ?? 10;

      if (input?.jenis) where.jenis = input.jenis;
      if (input?.topik) {
        where.topik = { contains: input.topik };
      }
      if (input?.status) where.status = input.status;
      if (input?.tahun) where.tahun = input.tahun;

      if (input?.search) {
        where.OR = [
          { title: { contains: input.search, mode: "insensitive" } },
          { nomor: { contains: input.search, mode: "insensitive" } },
          { deskripsi: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const [items, totalCount] = await Promise.all([
        ctx.db.peraturan.findMany({
          where,
          orderBy: [{ tahun: "desc" }, { nomor: "asc" }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        ctx.db.peraturan.count({ where }),
      ]);

      return {
        items,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        page,
      };
    }),

  // Get distinct values for filter dropdowns
  filterOptions: publicProcedure.query(async ({ ctx }) => {
    const [jenisValues, topikValues, statusValues, tahunValues] =
      await Promise.all([
        ctx.db.peraturan.findMany({
          select: { jenis: true },
          distinct: ["jenis"],
          orderBy: { jenis: "asc" },
        }),
        ctx.db.peraturan.findMany({
          select: { topik: true },
          distinct: ["topik"],
          orderBy: { topik: "asc" },
        }),
        ctx.db.peraturan.findMany({
          select: { status: true },
          distinct: ["status"],
          orderBy: { status: "asc" },
        }),
        ctx.db.peraturan.findMany({
          select: { tahun: true },
          distinct: ["tahun"],
          orderBy: { tahun: "desc" },
        }),
      ]);

    return {
      jenis: jenisValues.map((v) => v.jenis),
      topik: [...new Set(topikValues.flatMap((v) => v.topik.split(", ")))].sort(),
      status: statusValues.map((v) => v.status),
      tahun: tahunValues.map((v) => v.tahun),
    };
  }),
});
