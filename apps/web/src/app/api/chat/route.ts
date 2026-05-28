import {
  buildCitationBlock,
  embedTexts,
  streamGroundedAnswer,
  toCitations,
  validateCitationLabels,
  type Citation,
} from "@syntheci/ai";
import {
  chatMessages,
  chatThreads,
  citations,
  db,
  ensureDefaultWorkspace,
  findRelevantChunks,
} from "@syntheci/db";
import { chatRequestSchema } from "@syntheci/shared";
import { eq } from "drizzle-orm";
import { createUIMessageStream, createUIMessageStreamResponse, type UIMessage, type UIMessageStreamWriter } from "ai";

type SyntheciMessageMetadata = {
  citationCount?: number;
  citationWarnings?: ReturnType<typeof validateCitationLabels>;
  citations?: Citation[];
  reasoning?: string;
};

type SyntheciDataParts = {
  citations: {
    citations: Citation[];
  };
};

type SyntheciUIMessage = UIMessage<SyntheciMessageMetadata, SyntheciDataParts>;

export async function POST(request: Request) {
  const input = chatRequestSchema.parse(await request.json());
  const workspaceId = await ensureDefaultWorkspace();
  const incomingMessages = normalizeMessages(input.messages);
  const question = input.message ?? latestUserText(incomingMessages);

  if (!question) {
    return Response.json({ error: "No user message was provided." }, { status: 400 });
  }

  const threadId = input.threadId ?? crypto.randomUUID();
  const userMessage = latestUserMessage(incomingMessages, question);
  const assistantMessageId = crypto.randomUUID();

  await db
    .insert(chatThreads)
    .values({
      id: threadId,
      workspaceId,
      title: question.slice(0, 80),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: chatThreads.id,
      set: { updatedAt: new Date() },
    });

  await db
    .insert(chatMessages)
    .values({
      id: userMessage.id,
      threadId,
      role: "user",
      content: question,
      metadata: {},
    })
    .onConflictDoNothing();

  const [embedding] = await embedTexts([question], "query");
  const chunks = embedding ? await findRelevantChunks(workspaceId, embedding, 8, question) : [];
  const citationList = toCitations(chunks);
  const evidence = buildCitationBlock(chunks);

  const stream = createUIMessageStream<SyntheciUIMessage>({
    originalMessages: incomingMessages,
    generateId: () => assistantMessageId,
    execute: async ({ writer }) => {
      writer.write({
        type: "data-citations",
        id: "citations",
        data: { citations: citationList },
      });

      const result = streamGroundedAnswer(question, evidence);
      if (result instanceof Response) {
        await writeTextResponse(writer, result);
        return;
      }

      writer.merge(
        result.toUIMessageStream<SyntheciUIMessage>({
          sendReasoning: true,
        }),
      );
    },
    onFinish: async ({ responseMessage }) => {
      const content = messageText(responseMessage);
      const reasoning = messageReasoning(responseMessage);
      const citationWarnings = validateCitationLabels(content, citationList);
      const usedCitationList = filterUsedCitations(content, citationList);

      await db.insert(chatMessages).values({
        id: assistantMessageId,
        threadId,
        role: "assistant",
        content,
        metadata: {
          citationCount: usedCitationList.length,
          citationWarnings,
          citations: usedCitationList,
          reasoning,
        },
      });

      const documentCitations = usedCitationList.filter(
        (
          citation,
        ): citation is Citation & {
          sourceType: "document";
          documentId: string;
          chunkId: string;
        } => citation.sourceType === "document" && Boolean(citation.documentId) && Boolean(citation.chunkId),
      );

      if (documentCitations.length > 0) {
        await db.insert(citations).values(
          documentCitations.map((citation) => ({
            id: crypto.randomUUID(),
            messageId: assistantMessageId,
            documentId: citation.documentId,
            chunkId: citation.chunkId,
            label: citation.label,
            excerpt: citation.excerpt,
          })),
        );
      }

      await db.update(chatThreads).set({ updatedAt: new Date() }).where(eq(chatThreads.id, threadId));
    },
  });

  return createUIMessageStreamResponse({
    headers: {
      "x-syntheci-thread-id": threadId,
    },
    stream,
  });
}

function normalizeMessages(messages: unknown[] | undefined): SyntheciUIMessage[] {
  if (!messages) return [];

  return messages.filter(isUIMessage).map(
    (message) =>
      ({
        ...message,
        metadata: message.metadata as SyntheciMessageMetadata | undefined,
      }) as SyntheciUIMessage,
  );
}

function filterUsedCitations(text: string, citationList: Citation[]) {
  const usedRanks = new Set([...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1])));
  if (usedRanks.size === 0) return [];
  return citationList.filter((citation) => usedRanks.has(citation.rank));
}

function isUIMessage(value: unknown): value is UIMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "role" in value &&
    "parts" in value &&
    Array.isArray((value as { parts?: unknown }).parts)
  );
}

function latestUserText(messages: SyntheciUIMessage[]) {
  return messageText([...messages].reverse().find((message) => message.role === "user"));
}

function latestUserMessage(messages: SyntheciUIMessage[], fallbackText: string) {
  const message = [...messages].reverse().find((candidate) => candidate.role === "user");
  if (message) return { id: message.id, text: messageText(message) || fallbackText };
  return { id: crypto.randomUUID(), text: fallbackText };
}

function messageText(message: Pick<SyntheciUIMessage, "parts"> | undefined) {
  return (
    message?.parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("") ?? ""
  );
}

function messageReasoning(message: Pick<SyntheciUIMessage, "parts"> | undefined) {
  return (
    message?.parts
      .filter((part) => part.type === "reasoning")
      .map((part) => part.text)
      .join("\n\n")
      .trim() ?? ""
  );
}

async function writeTextResponse(
  writer: UIMessageStreamWriter<SyntheciUIMessage>,
  response: Response,
) {
  const text = await response.text();
  const textId = crypto.randomUUID();
  writer.write({ type: "start" });
  writer.write({ type: "text-start", id: textId });
  writer.write({ type: "text-delta", id: textId, delta: text });
  writer.write({ type: "text-end", id: textId });
  writer.write({ type: "finish", finishReason: "stop" });
}
