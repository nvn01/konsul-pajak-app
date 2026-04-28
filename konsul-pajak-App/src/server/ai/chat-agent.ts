"use server";

import { VertexAI, type GenerativeModel, type Tool } from "@google-cloud/vertexai";
import { env } from "nvn/env";

// ─── Configuration ────────────────────────────────────────────────────
const GEMINI_MODEL = "gemini-2.0-flash";

// ─── Lazy-initialized Vertex AI client ────────────────────────────────
// Must be lazy to avoid crashing during Next.js build (no env vars available)
let _model: GenerativeModel | null = null;
let _groundingTool: Tool | null = null;

function getModel(): GenerativeModel {
  if (!_model) {
    const vertexAI = new VertexAI({
      project: env.GCP_PROJECT_ID,
      location: env.GCP_LOCATION,
      googleAuthOptions: {
        keyFilename: env.GOOGLE_APPLICATION_CREDENTIALS,
      },
    });

    _model = vertexAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: {
        role: "system",
        parts: [
          {
            text: "Kamu adalah Konsul Pajak, asisten AI perpajakan Indonesia. Jawab secara formal, ringkas, tetap sopan, dan sertakan dasar hukum bila tersedia. Hindari spekulasi yang tidak berdasar. Gunakan konteks percakapan sebelumnya untuk memberikan jawaban yang lebih relevan. Jawab dalam Bahasa Indonesia.",
          },
        ],
      },
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 2048,
      },
    });
  }
  return _model;
}

function getGroundingTool(): Tool {
  if (!_groundingTool) {
    const dataStorePath = `projects/${env.GCP_PROJECT_ID}/locations/global/collections/default_collection/dataStores/${env.GCP_DATA_STORE_ID}`;
    _groundingTool = {
      retrieval: {
        vertexAiSearch: {
          datastore: dataStorePath,
        },
      },
    };
  }
  return _groundingTool;
}

// ─── Types ────────────────────────────────────────────────────────────
export type SourceCitation = {
  source: string;
  page?: number;
  snippet?: string;
};

export interface MessageHistory {
  role: "user" | "assistant";
  content: string;
}

// ─── Main Function ────────────────────────────────────────────────────
export async function answerTaxQuestion(
  question: string,
  messageHistory: MessageHistory[] = [],
): Promise<{
  answer: string;
  sources: SourceCitation[];
}> {
  // Keep last 10 messages for conversational context
  const MAX_HISTORY = 10;
  const recentHistory = messageHistory.slice(-MAX_HISTORY);

  try {
    const model = getModel();
    const groundingTool = getGroundingTool();

    // Build multi-turn conversation contents for Gemini
    const contents = [
      // Include conversation history
      ...recentHistory.map((msg) => ({
        role: msg.role === "user" ? "user" : ("model" as const),
        parts: [{ text: msg.content }],
      })),
      // Current user question
      {
        role: "user" as const,
        parts: [{ text: question }],
      },
    ];

    // Call Gemini with grounding (Vertex AI Search retrieval)
    const response = await model.generateContent({
      contents,
      tools: [groundingTool],
    });

    const candidate = response.response.candidates?.[0];
    const answer =
      candidate?.content?.parts?.[0]?.text?.trim() ??
      "Maaf, saya belum dapat menemukan jawaban pasti. Silakan ajukan pertanyaan lebih spesifik.";

    // Extract source citations from grounding metadata
    const sources = extractSources(candidate?.groundingMetadata);

    console.log(
      `[RAG] Gemini response received. Sources: ${sources.length}`,
    );

    return { answer, sources };
  } catch (error) {
    console.error("[RAG] Vertex AI Gemini request failed", error);
    return {
      answer:
        "Maaf, sistem sedang mengalami gangguan saat memproses pertanyaan Anda. Silakan coba lagi beberapa saat lagi.",
      sources: [],
    };
  }
}

// ─── Helper: Extract sources from Gemini grounding metadata ───────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractSources(
  groundingMetadata: any,
): SourceCitation[] {
  if (!groundingMetadata) return [];

  const sources: SourceCitation[] = [];

  // groundingChunks contain the retrieved document references
  const chunks = groundingMetadata.groundingChunks as
    | Array<{
        web?: { uri?: string; title?: string };
        retrievedContext?: { uri?: string; title?: string; text?: string };
      }>
    | undefined;

  if (chunks) {
    for (const chunk of chunks) {
      if (chunk.retrievedContext) {
        sources.push({
          source: chunk.retrievedContext.title ?? chunk.retrievedContext.uri ?? "Referensi",
          snippet: chunk.retrievedContext.text?.slice(0, 800),
        });
      } else if (chunk.web) {
        sources.push({
          source: chunk.web.title ?? chunk.web.uri ?? "Referensi Web",
          snippet: undefined,
        });
      }
    }
  }

  // Deduplicate sources by source name
  const seen = new Set<string>();
  return sources.filter((s) => {
    if (seen.has(s.source)) return false;
    seen.add(s.source);
    return true;
  });
}
