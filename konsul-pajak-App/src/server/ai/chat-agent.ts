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

const MODEL_ID = "gemini-2.5-flash"; // Matches konsul-hukum

function getDataStoreResource(): string {
  return `projects/${env.GCP_PROJECT_ID}/locations/global/collections/default_collection/dataStores/${env.GCP_DATA_STORE_ID}`;
}

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
        systemInstruction:
          "Kamu adalah Konsul Pajak, asisten AI perpajakan Indonesia. Jawab secara formal, ringkas, tetap sopan, dan sertakan dasar hukum bila tersedia. Hindari spekulasi yang tidak berdasar. Gunakan konteks percakapan sebelumnya untuk memberikan jawaban yang lebih relevan. Jawab dalam Bahasa Indonesia.",
        temperature: 0.2,
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
