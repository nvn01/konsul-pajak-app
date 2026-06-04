"use server";

import { GoogleGenAI } from "@google/genai";
import { env } from "nvn/env";

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
// Model: Gemini 3.5 Flash — strongest reasoning for legal/tax accuracy
// ---------------------------------------------------------------------------
const MODEL_ID = "gemini-3.5-flash";

function getDataStoreResource(): string {
  return `projects/${env.GCP_PROJECT_ID}/locations/global/collections/default_collection/dataStores/${env.GCP_DATA_STORE_ID}`;
}

// ---------------------------------------------------------------------------
// System prompt: comprehensive legal-domain instruction
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Kamu adalah **Konsul Pajak**, asisten AI ahli perpajakan Indonesia.

## ATURAN UTAMA
1. Gunakan dokumen yang di-retrieve sebagai dasar utama jika tersedia.
2. Jika dokumen yang di-retrieve tidak memuat jawaban yang cukup, kamu BOLEH memakai pengetahuan umum model tentang perpajakan Indonesia, tetapi hanya untuk topik yang masih terkait KUP (Ketentuan Umum dan Tata Cara Perpajakan), administrasi perpajakan, hak/kewajiban wajib pajak, sanksi, pemeriksaan, penagihan, keberatan, banding, atau konsep perpajakan Indonesia yang relevan.
3. Jika pertanyaan membutuhkan jawaban faktual yang sangat spesifik atau pasal/ayat yang kamu tidak yakin, jangan mengarang. Jelaskan keterbatasannya dan arahkan pengguna untuk mengecek peraturan terkait di Direktori.
4. **Selalu sertakan dasar hukum yang spesifik** jika dasar tersebut tersedia dan kamu yakin. Contoh: "Berdasarkan Pasal 17 ayat (1) huruf a UU Nomor 7 Tahun 2021 tentang HPP..."
5. Jika sebuah UU telah **diamendemen atau dicabut** oleh UU yang lebih baru, jelaskan UU mana yang berlaku saat ini dan sebutkan UU perubahannya.
6. Jawab dalam **Bahasa Indonesia** yang formal, jelas, dan terstruktur.

## FORMAT JAWABAN
- Mulai dengan **ringkasan jawaban** (1-2 kalimat langsung menjawab pertanyaan).
- Lalu berikan **penjelasan detail** dengan dasar hukum spesifik (UU, Pasal, Ayat).
- Jika relevan, berikan **contoh penerapan** sederhana.
- Akhiri dengan **catatan** jika ada ketentuan peralihan atau pengecualian yang perlu diperhatikan.

## DAFTAR REFERENSI (WAJIB)
Di akhir setiap jawaban, kamu WAJIB menambahkan daftar referensi dalam format JSON berikut.
Cantumkan HANYA peraturan yang benar-benar kamu sebutkan dalam jawaban di atas.
Jika referensi berasal dari dokumen RAG, sertakan "kutipan" berisi bunyi spesifik dari Pasal/Ayat yang relevan sesuai dokumen yang di-retrieve.
Jika referensi berasal dari pengetahuan umum model dan kamu tidak memiliki kutipan verbatim yang pasti, isi "kutipan" dengan ringkasan singkat yang relevan.
Gunakan format nama sumber yang mudah dicocokkan dengan Direktori, misalnya "UU Nomor 7 Tahun 2021", "Peraturan Pemerintah Nomor 55 Tahun 2022", "Peraturan Menteri Keuangan Nomor 168 Tahun 2023", "Peraturan Presiden Nomor X Tahun YYYY", atau "Keputusan Presiden Nomor X Tahun YYYY".

Format (HARUS persis seperti ini):

<<<REFERENSI>>>
[
  {
    "source": "UU Nomor X Tahun YYYY",
    "kutipan": "Pasal Z ayat (W): [Bunyi kutipan pasal/ayat di sini...]"
  }
]
<<<END_REFERENSI>>>

Contoh:

<<<REFERENSI>>>
[
  {
    "source": "UU Nomor 7 Tahun 2021",
    "kutipan": "Pasal 17 ayat (1) huruf a: Wajib Pajak orang pribadi dalam negeri dikenai Pajak Penghasilan dengan tarif..."
  }
]
<<<END_REFERENSI>>>

## CAKUPAN PENGETAHUAN
Database berisi 40 Undang-Undang perpajakan Indonesia, meliputi:
- Ketentuan Umum dan Tata Cara Perpajakan (KUP)
- Pajak Penghasilan (PPh)
- Pajak Pertambahan Nilai (PPN) dan Pajak Penjualan atas Barang Mewah (PPnBM)
- Bea Materai
- Pajak Bumi dan Bangunan (PBB)
- Bea Perolehan Hak atas Tanah dan Bangunan (BPHTB)
- Pengadilan Pajak
- Penagihan Pajak dengan Surat Paksa
- Harmonisasi Peraturan Perpajakan (HPP/UU 7/2021)
- Cipta Kerja (UU 6/2023, UU 11/2020)
- Tax Amnesty / Pengampunan Pajak
- Dan peraturan terkait lainnya dari tahun 1984 hingga 2025

## YANG TIDAK BOLEH DILAKUKAN
- JANGAN memberikan nasihat pajak personal yang spesifik (seperti "Anda harus membayar Rp X").
- JANGAN menjawab pertanyaan di luar topik perpajakan Indonesia.
- JANGAN menyebutkan pasal atau ayat yang tidak kamu yakini.
- Jika pertanyaan ambigu, minta klarifikasi sebelum menjawab.

Gunakan konteks percakapan sebelumnya untuk menjaga kontinuitas diskusi.`;

const MODEL_KNOWLEDGE_FALLBACK_PROMPT = `${SYSTEM_PROMPT}

## MODE TANPA RAG
Jawab menggunakan pengetahuan umum model tentang perpajakan Indonesia karena pemanggilan RAG tidak berhasil menghasilkan jawaban.
Tetap batasi jawaban pada topik perpajakan Indonesia dan pertanyaan yang relevan dengan KUP, PPh, PPN, peraturan pelaksana, administrasi perpajakan, atau konsep perpajakan Indonesia.
Jangan menyebutkan bahwa jawaban berasal dari mode fallback, model knowledge, atau tanpa RAG.
Tetap berikan daftar referensi dalam format <<<REFERENSI>>> yang sama.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SourceCitation = {
  source: string;
  page?: number;
  snippet?: string;
  kutipan?: string;
  url?: string;
};

export interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}

// ---------------------------------------------------------------------------
// Main function: Ask a tax question, get a grounded answer
// ---------------------------------------------------------------------------
export async function answerTaxQuestion(
  question: string,
  messageHistory: MessageHistory[] = []
): Promise<{
  answer: string;
  sources: SourceCitation[];
}> {
  const MAX_HISTORY = 10;
  const recentHistory = messageHistory.slice(-MAX_HISTORY);

  // Build the conversation contents for Gemini multi-turn
  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];

  // Add conversation history
  for (const msg of recentHistory) {
    contents.push({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }],
    });
  }

  // Add the current question
  contents.push({
    role: "user",
    parts: [{ text: question }],
  });

  try {
    const response = await getAI().models.generateContent({
      model: MODEL_ID,
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.1,
        // Enable thinking/reasoning for deeper legal analysis
        thinkingConfig: {
          thinkingBudget: 2048,
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

    const rawText = response.text?.trim() ?? (await answerWithModelKnowledge(contents));

    // Parse the answer and extract inline references from the AI's response
    const { answer, sources } = parseAnswerAndSources(
      rawText ??
        "Maaf, saya belum dapat menemukan jawaban pasti. Silakan ajukan pertanyaan lebih spesifik."
    );

    return { answer, sources };
  } catch (error) {
    console.error("[RAG] Vertex AI completion failed", error);
    const fallbackText = await answerWithModelKnowledge(contents);

    if (fallbackText) {
      const { answer, sources } = parseAnswerAndSources(fallbackText);
      return { answer, sources };
    }

    return {
      answer:
        "Maaf, sistem sedang mengalami gangguan saat memproses pertanyaan Anda. Silakan coba lagi beberapa saat lagi.",
      sources: [],
    };
  }
}

async function answerWithModelKnowledge(
  contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }>
): Promise<string | undefined> {
  try {
    const response = await getAI().models.generateContent({
      model: MODEL_ID,
      contents,
      config: {
        systemInstruction: MODEL_KNOWLEDGE_FALLBACK_PROMPT,
        temperature: 0.1,
      },
    });

    return response.text?.trim();
  } catch (error) {
    console.error("[RAG] Model-knowledge fallback failed", error);
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Parse answer text and extract inline <<<REFERENSI>>> JSON block
// ---------------------------------------------------------------------------
function parseAnswerAndSources(rawText: string): {
  answer: string;
  sources: SourceCitation[];
} {
  try {
    // Look for the <<<REFERENSI>>> ... <<<END_REFERENSI>>> block
    const refRegex = /<<<REFERENSI>>>\s*([\s\S]*?)\s*<<<END_REFERENSI>>>/;
    const match = rawText.match(refRegex);

    if (!match) {
      // No reference block found — return the full text as answer with no sources
      return { answer: rawText.trim(), sources: [] };
    }

    // Extract the clean answer (everything before the reference block)
    const answer = rawText
      .replace(refRegex, "")
      .trim();

    // Parse the JSON sources
    const jsonStr = match[1]?.trim() ?? "[]";
    let parsedSources: SourceCitation[] = [];

    try {
      const parsed = JSON.parse(jsonStr);
      if (Array.isArray(parsed)) {
        parsedSources = parsed
          .filter((item: any) => item && typeof item.source === "string")
          .map((item: any) => ({
            source: item.source,
            kutipan: item.kutipan,
          }));
      }
    } catch (jsonError) {
      console.error("[RAG] Failed to parse reference JSON:", jsonError);
    }

    return { answer, sources: parsedSources };
  } catch (error) {
    console.error("[RAG] Failed to parse answer and sources", error);
    return { answer: rawText.trim(), sources: [] };
  }
}
