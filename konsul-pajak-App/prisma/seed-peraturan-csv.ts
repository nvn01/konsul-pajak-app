import { PrismaClient } from "@prisma/client";
import { existsSync, readFileSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type CsvRow = Record<string, string>;

type PeraturanInput = {
  title: string;
  nomor: string;
  jenis: string;
  topik: string;
  tahun: string;
  status: string;
  deskripsi: string;
  url: string;
};

const REQUIRED_HEADERS = [
  "title",
  "nomor",
  "jenis",
  "topik",
  "tahun",
  "status",
  "deskripsi",
  "url",
] as const;

function parseCsv(content: string): CsvRow[] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentField);
      currentField = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i += 1;
      }

      currentRow.push(currentField);
      currentField = "";

      if (currentRow.some((value) => value.length > 0)) {
        rows.push(currentRow);
      }

      currentRow = [];
      continue;
    }

    currentField += char;
  }

  if (currentField.length > 0 || currentRow.length > 0) {
    currentRow.push(currentField);
    if (currentRow.some((value) => value.length > 0)) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) {
    return [];
  }

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) {
    return [];
  }

  const headers = headerRow.map((header) => header.trim());

  for (const requiredHeader of REQUIRED_HEADERS) {
    if (!headers.includes(requiredHeader)) {
      throw new Error(`Missing required CSV header: ${requiredHeader}`);
    }
  }

  return dataRows.map((row, rowIndex) => {
    const record: CsvRow = {};

    headers.forEach((header, index) => {
      record[header] = (row[index] ?? "").trim();
    });

    if (!record.nomor) {
      throw new Error(`Row ${rowIndex + 2} has empty "nomor" value.`);
    }

    return record;
  });
}

function normalizeRows(rows: CsvRow[]): PeraturanInput[] {
  const deduped = new Map<string, PeraturanInput>();

  for (const row of rows) {
    const item: PeraturanInput = {
      title: row.title ?? "",
      nomor: row.nomor ?? "",
      jenis: row.jenis ?? "",
      topik: row.topik ?? "",
      tahun: row.tahun ?? "",
      status: row.status ?? "",
      deskripsi: row.deskripsi ?? "",
      url: row.url ?? "",
    };

    deduped.set(item.nomor, item);
  }

  return [...deduped.values()];
}

async function upsertChunk(items: PeraturanInput[]) {
  await prisma.$transaction(
    items.map((item) =>
      prisma.peraturan.upsert({
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
        create: item,
      }),
    ),
  );
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const cliPath = args.find((arg) => !arg.startsWith("--"));
  const csvPath = cliPath
    ? isAbsolute(cliPath)
      ? cliPath
      : resolve(process.cwd(), cliPath)
    : resolve(__dirname, "..", "..", "combined_regulations_with_urls.csv");

  if (!existsSync(csvPath)) {
    throw new Error(`CSV file not found: ${csvPath}`);
  }

  const content = readFileSync(csvPath, "utf-8");
  const parsedRows = parseCsv(content);
  const peraturanList = normalizeRows(parsedRows);

  console.log(`CSV file: ${csvPath}`);
  console.log(`Parsed rows: ${parsedRows.length}`);
  console.log(`Unique nomor: ${peraturanList.length}`);

  if (dryRun) {
    console.log("Dry run enabled. No database changes were made.");
    return;
  }

  const chunkSize = 100;

  for (let index = 0; index < peraturanList.length; index += chunkSize) {
    const chunk = peraturanList.slice(index, index + chunkSize);
    await upsertChunk(chunk);
    console.log(
      `Processed ${Math.min(index + chunk.length, peraturanList.length)}/${peraturanList.length}`,
    );
  }

  console.log(`✅ Imported ${peraturanList.length} peraturan from CSV.`);
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
