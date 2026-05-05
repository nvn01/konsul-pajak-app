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
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = {};

      if (input?.jenis) where.jenis = input.jenis;
      if (input?.topik) {
        // topik can be comma-separated like "PPh, KUP" so use contains
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

      return ctx.db.peraturan.findMany({
        where,
        orderBy: [{ tahun: "desc" }, { nomor: "asc" }],
      });
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
