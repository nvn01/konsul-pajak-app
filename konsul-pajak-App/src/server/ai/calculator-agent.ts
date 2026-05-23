"use server";

import { GoogleGenAI } from "@google/genai";
import { env } from "nvn/env";
import type { SourceCitation } from "nvn/server/ai/chat-agent";

// ---------------------------------------------------------------------------
// Vertex AI client — lazy-initialized to avoid build-time auth errors.
// Authenticates via GOOGLE_APPLICATION_CREDENTIALS env var at runtime.
// ---------------------------------------------------------------------------
let _ai: GoogleGenAI | null = null;

function getAI(): GoogleGenAI {
  if (!_ai) {
    _ai = new GoogleGenAI({
      vertexai: true,
      project: env.GCP_PROJECT_ID,
      location: env.GCP_LOCATION,
    });
  }
  return _ai;
}

// ---------------------------------------------------------------------------
// Model: Gemini 2.5 Pro — strongest reasoning for legal/tax accuracy
// ---------------------------------------------------------------------------
const MODEL_ID = "gemini-2.5-pro";

function getDataStoreResource(): string {
  return `projects/${env.GCP_PROJECT_ID}/locations/global/collections/default_collection/dataStores/${env.GCP_DATA_STORE_ID}`;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type TarifDetail = {
  lapisan: string;
  tarif: string;
  pajak?: number;
};

export type TaxCalculationResult = {
  kategori: string;
  subKategori: string;
  tarif: TarifDetail[];
  dpp: number;
  dppPenjelasan: string;
  pajakTerutang: number;
  perhitungan: string[];
  analisis: string;
  dasarHukum: SourceCitation[];
  ringkasan: string;
  inputParsed: Record<string, unknown>;
};

// ---------------------------------------------------------------------------
// System prompt: comprehensive tax calculator instruction
// ---------------------------------------------------------------------------
const CALCULATOR_SYSTEM_PROMPT = `Kamu adalah **Konsul Pajak \u2014 Kalkulator**, modul perhitungan pajak AI berbasis peraturan perpajakan Indonesia.

## TUGAS UTAMA
Analisis deskripsi situasi keuangan pengguna, tentukan jenis pajak yang berlaku, dan hitung pajak terutang secara tepat berdasarkan peraturan yang berlaku.

## ATURAN UTAMA
1. **HANYA gunakan informasi dari dokumen yang di-retrieve** (grounding). JANGAN mengarang tarif atau ketentuan.
2. **Selalu sertakan dasar hukum spesifik**: sebutkan nomor UU, Pasal, Ayat yang relevan.
3. Jika informasi tidak cukup untuk menghitung, jelaskan apa yang kurang dan berikan estimasi terbaik dengan asumsi yang jelas.
4. Gunakan tarif dan ketentuan yang berlaku saat ini (setelah amendemen/HPP/UU terbaru).

## JENIS PAJAK YANG DIDUKUNG
- **PPh Pasal 21**: Pajak penghasilan karyawan (metode TER / tarif progresif)
- **PPh Pasal 23**: Withholding tax (jasa, royalti, dividen, bunga)
- **PPh Final**: PPh Final UMKM 0.5%, PPh Final Jasa Konstruksi, dll.
- **PPN**: Pajak Pertambahan Nilai (11% atau 12%)
- **PPh Badan**: Pajak penghasilan badan usaha (22%)
- **PPh Pasal 4 ayat (2)**: PPh Final lainnya
- **Bea Materai**: Jika relevan

## TARIF PROGRESIF PPh PASAL 21 (UU HPP)
- Sampai Rp 60.000.000: 5%
- Rp 60.000.000 - Rp 250.000.000: 15%
- Rp 250.000.000 - Rp 500.000.000: 25%
- Rp 500.000.000 - Rp 5.000.000.000: 30%
- Di atas Rp 5.000.000.000: 35%

## PTKP (Penghasilan Tidak Kena Pajak) TERBARU
- TK/0 (Tidak Kawin, tanpa tanggungan): Rp 54.000.000/tahun
- K/0 (Kawin, tanpa tanggungan): Rp 58.500.000/tahun
- K/1 (Kawin, 1 tanggungan): Rp 63.000.000/tahun
- K/2 (Kawin, 2 tanggungan): Rp 67.500.000/tahun
- K/3 (Kawin, 3 tanggungan): Rp 72.000.000/tahun

## FORMAT OUTPUT (WAJIB)
Kamu WAJIB mengembalikan hasil dalam format JSON yang tepat di antara marker berikut.
Pastikan JSON valid dan dapat di-parse.

<<<KALKULASI>>>
{
  "kategori": "PPh Pasal 21",
  "subKategori": "Karyawan Tetap \u2014 Tarif Progresif",
  "tarif": [
    { "lapisan": "0 - 60 juta", "tarif": "5%", "pajak": 3000000 },
    { "lapisan": "60 juta - 250 juta", "tarif": "15%", "pajak": 0 }
  ],
  "dpp": 66000000,
  "dppPenjelasan": "Penghasilan bruto Rp 120.000.000 - PTKP K/1 Rp 63.000.000 = DPP Rp 57.000.000",
  "pajakTerutang": 2850000,
  "perhitungan": [
    "Penghasilan bruto per tahun: Rp 10.000.000 x 12 = Rp 120.000.000",
    "PTKP (K/1): Rp 63.000.000",
    "Penghasilan Kena Pajak (PKP): Rp 120.000.000 - Rp 63.000.000 = Rp 57.000.000",
    "PPh Pasal 21: 5% x Rp 57.000.000 = Rp 2.850.000",
    "PPh per bulan: Rp 2.850.000 / 12 = Rp 237.500"
  ],
  "analisis": "Berdasarkan penghasilan bruto tahunan Rp 120 juta dan status PTKP K/1...",
  "dasarHukum": [
    {
      "source": "UU Nomor 7 Tahun 2021",
      "kutipan": "Pasal 17 ayat (1) huruf a: Tarif pajak yang diterapkan atas Penghasilan Kena Pajak..."
    }
  ],
  "ringkasan": "PPh Pasal 21 terutang sebesar Rp 2.850.000/tahun (Rp 237.500/bulan)",
  "inputParsed": {
    "penghasilan": 10000000,
    "periode": "bulanan",
    "status": "K/1"
  }
}
<<<END_KALKULASI>>>

## PENTING
- Semua angka pajak dalam Rupiah (tanpa simbol Rp dalam angka JSON, hanya angka).
- Field "analisis" bisa berisi markdown untuk penjelasan lebih detail.
- Field "perhitungan" harus berisi array string, setiap string adalah satu langkah perhitungan.
- Field "tarif" harus berisi array objek yang menunjukkan lapisan tarif yang digunakan.
- Jika ada beberapa jenis pajak yang berlaku, pilih yang paling relevan berdasarkan deskripsi pengguna.
- Jika pengguna tidak menyebutkan status PTKP, asumsikan TK/0 dan sebutkan dalam analisis.

## CAKUPAN PENGETAHUAN
Database berisi 40 Undang-Undang perpajakan Indonesia, termasuk:
- KUP, PPh, PPN/PPnBM, Bea Materai, PBB, BPHTB
- HPP (UU 7/2021), Cipta Kerja (UU 6/2023)
- Tax Amnesty, Pengadilan Pajak, dan lainnya

## YANG TIDAK BOLEH DILAKUKAN
- JANGAN menjawab pertanyaan di luar topik perpajakan.
- JANGAN menggunakan tarif yang tidak ada dalam dokumen retrieve.
- Jika ragu, sebutkan asumsi yang digunakan.`;

// ---------------------------------------------------------------------------
// Main function: Calculate tax from natural language description
// ---------------------------------------------------------------------------
export async function calculateTax(
  description: string,
): Promise<TaxCalculationResult> {
  try {
    const response = await getAI().models.generateContent({
      model: MODEL_ID,
      contents: [
        {
          role: "user",
          parts: [{ text: description }],
        },
      ],
      config: {
        systemInstruction: CALCULATOR_SYSTEM_PROMPT,
        temperature: 0.1,
        // Enable thinking/reasoning for deeper legal analysis
        thinkingConfig: {
          thinkingBudget: 4096,
        },
        // Grounding: use Vertex AI Search data store for RAG
        tools: [
          {
            retrieval: {
              vertexAiSearch: {
                datastore: getDataStoreResource(),
              },
            },
          },
        ],
      },
    });

    const rawText =
      response.text?.trim() ?? "";

    return parseCalculationResult(rawText);
  } catch (error) {
    console.error("[Calculator] Vertex AI calculation failed", error);
    return {
      kategori: "Error",
      subKategori: "Gagal memproses",
      tarif: [],
      dpp: 0,
      dppPenjelasan: "",
      pajakTerutang: 0,
      perhitungan: ["Terjadi kesalahan saat memproses perhitungan."],
      analisis:
        "Maaf, sistem sedang mengalami gangguan saat memproses perhitungan Anda. Silakan coba lagi beberapa saat lagi.",
      dasarHukum: [],
      ringkasan: "Gagal menghitung pajak",
      inputParsed: {},
    };
  }
}

// ---------------------------------------------------------------------------
// Parse the <<<KALKULASI>>> JSON block from AI response
// ---------------------------------------------------------------------------
function parseCalculationResult(rawText: string): TaxCalculationResult {
  const fallback: TaxCalculationResult = {
    kategori: "Tidak Teridentifikasi",
    subKategori: "",
    tarif: [],
    dpp: 0,
    dppPenjelasan: "",
    pajakTerutang: 0,
    perhitungan: [],
    analisis: rawText || "Tidak dapat menganalisis input yang diberikan.",
    dasarHukum: [],
    ringkasan: "Tidak dapat menghitung pajak dari deskripsi yang diberikan",
    inputParsed: {},
  };

  try {
    // eslint-disable-next-line no-useless-escape
    const calcRegex = /<<<KALKULASI>>>\s*([\s\S]*?)\s*<<<END_KALKULASI>>>/;
    const match = rawText.match(calcRegex);

    if (!match || !match[1]) {
      console.error("[Calculator] No <<<KALKULASI>>> block found in response");
      return fallback;
    }

    const jsonStr = match[1].trim();
    const parsed = JSON.parse(jsonStr);

    return {
      kategori: parsed.kategori ?? fallback.kategori,
      subKategori: parsed.subKategori ?? "",
      tarif: Array.isArray(parsed.tarif) ? parsed.tarif : [],
      dpp: typeof parsed.dpp === "number" ? parsed.dpp : 0,
      dppPenjelasan: parsed.dppPenjelasan ?? "",
      pajakTerutang:
        typeof parsed.pajakTerutang === "number" ? parsed.pajakTerutang : 0,
      perhitungan: Array.isArray(parsed.perhitungan)
        ? parsed.perhitungan
        : [],
      analisis: parsed.analisis ?? "",
      dasarHukum: Array.isArray(parsed.dasarHukum)
        ? parsed.dasarHukum.filter(
            (item: any) => item && typeof item.source === "string",
          )
        : [],
      ringkasan: parsed.ringkasan ?? "",
      inputParsed: parsed.inputParsed ?? {},
    };
  } catch (error) {
    console.error("[Calculator] Failed to parse calculation result", error);
    return fallback;
  }
}
