import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { embedMany, extractReasoningMiddleware, generateText, streamText, wrapLanguageModel } from "ai";
import { EMBEDDING_DIMENSIONS, getServerEnv } from "@syntheci/shared";

type EmbeddingTask = "document" | "query";

export function chatModel() {
  const env = getServerEnv();
  return wrapLanguageModel({
    model: groq(env.AI_CHAT_MODEL),
    middleware: extractReasoningMiddleware({ tagName: "think" }),
  });
}

export function embeddingModel() {
  const env = getServerEnv();
  return google.embedding(env.AI_EMBEDDING_MODEL);
}

export async function embedTexts(values: string[], task: EmbeddingTask = "document") {
  if (values.length === 0) return [];
  const env = getServerEnv();
  if (!env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return values.map((value) => deterministicEmbedding(value));
  }

  const { embeddings } = await embedMany({
    model: embeddingModel(),
    values,
    providerOptions: {
      google: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
        taskType: task === "query" ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT",
      },
    },
  });
  return embeddings;
}

export async function draftAutomationBrief(question: string, evidence: string) {
  const env = getServerEnv();
  if (!env.GROQ_API_KEY) {
    return [
      "Answer: AI provider is not configured, so this run produced a deterministic scaffold brief.",
      "",
      `Question: ${question}`,
      "",
      "Evidence reviewed:",
      evidence || "No retrieved evidence was available.",
      "",
      "Next actions: add GROQ_API_KEY, rerun the automation, and compare against the cited evidence trail.",
    ].join("\n");
  }

  const { text } = await generateText({
    model: chatModel(),
    system: maritimeSystemPrompt,
    prompt: buildGroundedPrompt(question, evidence),
  });
  return text;
}

export function streamGroundedAnswer(question: string, evidence: string) {
  const env = getServerEnv();
  if (!env.GROQ_API_KEY) {
    const text = [
      "AI provider is not configured, so this scaffold is returning a deterministic cited brief.",
      "",
      buildGroundedPrompt(question, evidence),
    ].join("\n");

    return new Response(text, {
      headers: {
        "content-type": "text/plain; charset=utf-8",
      },
    });
  }

  return streamText({
    model: chatModel(),
    system: maritimeSystemPrompt,
    prompt: buildGroundedPrompt(question, evidence),
  });
}

function deterministicEmbedding(value: string) {
  const dimensions = EMBEDDING_DIMENSIONS;
  const vector = new Array<number>(dimensions).fill(0);

  for (let index = 0; index < value.length; index += 1) {
    const bucket = index % dimensions;
    vector[bucket] += (value.charCodeAt(index) % 31) / 31;
  }

  const magnitude = Math.hypot(...vector) || 1;
  return vector.map((entry) => Number((entry / magnitude).toFixed(6)));
}

export const maritimeSystemPrompt = [
  "You are Syntheci, a private maritime intelligence layer.",
  "Answer only from retrieved evidence. If evidence is missing, say what is missing.",
  "Cite every material factual claim with retrieved source labels such as [1] or [2].",
  "Never cite labels that are not present in the retrieved evidence block.",
  "Prioritize voyage risk, charterparty clauses, compliance exposure, emissions, vessel movements, ports, cargo, and auditability.",
].join(" ");

export function buildGroundedPrompt(question: string, evidence: string) {
  return [
    "Question:",
    question,
    "",
    "Retrieved evidence:",
    evidence || "No retrieved evidence was available.",
    "",
    "Return a concise decision brief with: answer, evidence, assumptions, and recommended next actions.",
    "Use bracket citations inline, and do not include an uncited evidence section.",
  ].join("\n");
}
