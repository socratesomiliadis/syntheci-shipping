import { buildCitationBlock, embedTexts, streamGroundedAnswer, toCitations } from "@syntheci/ai";
import {
  chatMessages,
  chatThreads,
  citations,
  db,
  ensureDefaultWorkspace,
  findRelevantChunks,
} from "@syntheci/db";
import { chatRequestSchema } from "@syntheci/shared";

export async function POST(request: Request) {
  const { message, threadId: inputThreadId } = chatRequestSchema.parse(await request.json());
  const workspaceId = await ensureDefaultWorkspace();
  const threadId = inputThreadId ?? crypto.randomUUID();

  if (!inputThreadId) {
    await db.insert(chatThreads).values({
      id: threadId,
      workspaceId,
      title: message.slice(0, 80),
    });
  }

  await db.insert(chatMessages).values({
    id: crypto.randomUUID(),
    threadId,
    role: "user",
    content: message,
  });

  const [embedding] = await embedTexts([message], "query");
  const chunks = embedding ? await findRelevantChunks(workspaceId, embedding, 6) : [];
  const citationList = toCitations(chunks);
  const assistantMessageId = crypto.randomUUID();

  await db.insert(chatMessages).values({
    id: assistantMessageId,
    threadId,
    role: "assistant",
    content: "Streaming response",
    metadata: { citationCount: citationList.length },
  });

  if (citationList.length > 0) {
    await db.insert(citations).values(
      citationList.map((citation) => ({
        id: crypto.randomUUID(),
        messageId: assistantMessageId,
        ...citation,
      })),
    );
  }

  const result = streamGroundedAnswer(message, buildCitationBlock(chunks));
  if (result instanceof Response) return result;

  return result.toTextStreamResponse({
    headers: {
      "x-syntheci-thread-id": threadId,
      "x-syntheci-citations": encodeURIComponent(JSON.stringify(citationList)),
    },
  });
}
