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
// Model: Gemini 2.5 Pro — strongest reasoning for legal/tax accuracy
// ---------------------------------------------------------------------------
const MODEL_ID = "gemini-2.5-pro";

function getDataStoreResource(): string {
  return `projects/${env.GCP_PROJECT_ID}/locations/global/collections/default_collection/dataStores/${env.GCP_DATA_STORE_ID}`;
}

// ---------------------------------------------------------------------------
// System prompt: comprehensive legal-domain instruction
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Kamu adalah **Konsul Pajak**, asisten AI ahli perpajakan Indonesia.

## ATURAN UTAMA
1. **HANYA gunakan informasi dari dokumen yang di-retrieve** (grounding). JANGAN mengarang, mengira-ngira, atau menggunakan pengetahuan umum yang tidak ada dalam dokumen.
2. Jika informasi yang dibutuhkan **tidak ditemukan** dalam dokumen yang di-retrieve, jawab dengan jujur: "Maaf, saya tidak menemukan informasi tersebut dalam database peraturan yang tersedia. Silakan konsultasikan dengan konsultan pajak profesional."
3. **Selalu sertakan dasar hukum yang spesifik**: sebutkan nomor UU, Pasal, Ayat, dan/atau huruf yang relevan. Contoh: "Berdasarkan Pasal 17 ayat (1) huruf a UU Nomor 7 Tahun 2021 tentang HPP..."
4. Jika sebuah UU telah **diamendemen atau dicabut** oleh UU yang lebih baru, jelaskan UU mana yang berlaku saat ini dan sebutkan UU perubahannya.
5. Jawab dalam **Bahasa Indonesia** yang formal, jelas, dan terstruktur.

## FORMAT JAWABAN
- Mulai dengan **ringkasan jawaban** (1-2 kalimat langsung menjawab pertanyaan).
- Lalu berikan **penjelasan detail** dengan dasar hukum spesifik (UU, Pasal, Ayat).
- Jika relevan, berikan **contoh penerapan** sederhana.
- Akhiri dengan **catatan** jika ada ketentuan peralihan atau pengecualian yang perlu diperhatikan.

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
- JANGAN menyebutkan pasal atau ayat yang tidak ada dalam dokumen yang di-retrieve.
- Jika pertanyaan ambigu, minta klarifikasi sebelum menjawab.

Gunakan konteks percakapan sebelumnya untuk menjaga kontinuitas diskusi.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type SourceCitation = {
  source: string;
  page?: number;
  snippet?: string;
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

    const answer =
      response.text?.trim() ??
      "Maaf, saya belum dapat menemukan jawaban pasti. Silakan ajukan pertanyaan lebih spesifik.";

    // Extract source citations from grounding metadata
    const sources = extractSources(response);

    return { answer, sources };
  } catch (error) {
    console.error("[RAG] Vertex AI completion failed", error);
    return {
      answer:
        "Maaf, sistem sedang mengalami gangguan saat memproses pertanyaan Anda. Silakan coba lagi beberapa saat lagi.",
      sources: [],
    };
  }
}

// ---------------------------------------------------------------------------
// Extract source citations from Vertex AI grounding metadata
// ---------------------------------------------------------------------------
function extractSources(response: any): SourceCitation[] {
  try {
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    if (!groundingMetadata) return [];

    const chunks = groundingMetadata.groundingChunks ?? [];
    const supports = groundingMetadata.groundingSupports ?? [];

    const sources: SourceCitation[] = [];
    const seenSources = new Set<string>();

    // Extract from grounding chunks (retrieved document references)
    for (const chunk of chunks) {
      const retrievedContext = chunk.retrievedContext;
      if (retrievedContext) {
        const uri = retrievedContext.uri ?? "";
        const title = retrievedContext.title ?? "";
        const sourceKey = title || uri || `Referensi ${sources.length + 1}`;

        if (!seenSources.has(sourceKey)) {
          seenSources.add(sourceKey);
          sources.push({
            source: sourceKey,
            snippet: chunk.web?.title ?? undefined,
          });
        }
      }
    }

    // Extract from grounding supports (text snippets with source info)
    for (const support of supports) {
      const segment = support.segment;
      if (segment?.text && sources.length > 0) {
        // Attach snippet text to the first source that doesn't have one yet
        const targetSource = sources.find((s) => !s.snippet);
        if (targetSource) {
          targetSource.snippet = segment.text.slice(0, 800);
        }
      }
    }

    // If no structured sources found, return empty
    if (sources.length === 0) return [];

    return sources;
  } catch (error) {
    console.error("[RAG] Failed to extract grounding sources", error);
    return [];
  }
}
