import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();

interface PeraturanData {
  title: string;
  nomor: string;
  jenis: string;
  topik: string;
  tahun: string;
  status: string;
  deskripsi: string;
  url: string;
}

async function main() {
  const jsonPath = path.join(__dirname, "uu.json");
  const rawData = fs.readFileSync(jsonPath, "utf-8");
  const peraturanList: PeraturanData[] = JSON.parse(rawData);

  console.log(`Seeding ${peraturanList.length} peraturan...`);

  for (const item of peraturanList) {
    await prisma.peraturan.upsert({
      where: { nomor: item.nomor },
      update: {
        title: item.title,
        jenis: item.jenis,
        topik: item.topik,
        tahun: item.tahun,
        status: item.status,
        deskripsi: item.deskripsi,
        url: item.url,
      },
      create: {
        title: item.title,
        nomor: item.nomor,
        jenis: item.jenis,
        topik: item.topik,
        tahun: item.tahun,
        status: item.status,
        deskripsi: item.deskripsi,
        url: item.url,
      },
    });
  }

  console.log(`✅ Seeded ${peraturanList.length} peraturan successfully.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
