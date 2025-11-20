"use server";

import OpenAI from "openai/index.mjs";
import { ChromaClient } from "chromadb";

import { env } from "nvn/env";

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

const chroma = new ChromaClient({
  path: env.CHROMA_HOST,
});

const COLLECTION_NAME = "pajak_docs";
const MAX_SNIPPET_LENGTH = 800;

export type SourceCitation = {
  source: string;
  page?: number;
  snippet?: string;
};

async function fetchContext(question: string): Promise<{
  promptContext: string;
  sources: SourceCitation[];
}> {
  try {
    const collection = await chroma.getOrCreateCollection({
      name: COLLECTION_NAME,
    });

    const queryResult = await collection.query({
      queryTexts: [question],
      nResults: 4,
    });

    const documents = queryResult.documents?.[0] ?? [];
    const metadatas = (queryResult.metadatas?.[0] ?? []) as Record<
      string,
      unknown
    >[];

    const sources: SourceCitation[] = documents.map((doc, idx) => {
      const metadata = metadatas[idx] ?? {};
      const rawSnippet =
        typeof doc === "string" ? doc : JSON.stringify(doc, null, 2);

      return {
        source:
          (metadata.title as string) ??
          (metadata.source as string) ??
          (metadata.uu as string) ??
          `Referensi ${idx + 1}`,
        page:
          typeof metadata.page === "number"
            ? metadata.page
            : metadata.page
              ? Number(metadata.page)
              : undefined,
        snippet: rawSnippet.slice(0, MAX_SNIPPET_LENGTH),
      };
    });

    const promptContext = sources
      .map(
        (src, idx) =>
          `[#${idx + 1}] ${src.source}${
            src.page ? ` (hal ${src.page})` : ""
          }\n${src.snippet ?? ""}`,
      )
      .join("\n\n");

    return { promptContext, sources };
  } catch (error) {
    console.error("[RAG] Chroma query failed", error);
    return { promptContext: "", sources: [] };
  }
}

export async function answerTaxQuestion(question: string): Promise<{
  answer: string;
  sources: SourceCitation[];
}> {
  const { promptContext, sources } = await fetchContext(question);

  const systemPrompt =
    "Kamu adalah Konsul Pajak, asisten AI perpajakan Indonesia. Jawab secara formal, ringkas, tetap sopan, dan sertakan dasar hukum bila tersedia. Hindari spekulasi yang tidak berdasar.";

  const userPrompt = promptContext
    ? `Gunakan referensi berikut untuk menjawab pertanyaan perpajakan.\n\nKonteks:\n${promptContext}\n\nPertanyaan: ${question}`
    : `Tidak ada konteks tambahan yang relevan. Jawab pertanyaan terkait perpajakan Indonesia sebaik mungkin berdasarkan peraturan resmi.\n\nPertanyaan: ${question}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    const answer =
      completion.choices[0]?.message?.content?.trim() ??
      "Maaf, saya belum dapat menemukan jawaban pasti. Silakan ajukan pertanyaan lebih spesifik.";

    return { answer, sources };
  } catch (error) {
    console.error("[RAG] OpenAI completion failed", error);
    return {
      answer:
        "Maaf, sistem sedang mengalami gangguan saat memproses pertanyaan Anda. Silakan coba lagi beberapa saat lagi.",
      sources,
    };
  }
}
