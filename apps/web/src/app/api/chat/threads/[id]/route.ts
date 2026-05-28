import { chatMessages, chatThreads, db, ensureDefaultWorkspace } from "@syntheci/db";
import { asc, and, eq } from "drizzle-orm";
import type { UIMessage } from "ai";
import type { Citation } from "@syntheci/ai";

type ChatMessageMetadata = Record<string, unknown> & {
  citations?: Citation[];
  reasoning?: string;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const workspaceId = await ensureDefaultWorkspace();
  const [thread] = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, id), eq(chatThreads.workspaceId, workspaceId)))
    .limit(1);

  if (!thread) {
    return Response.json({ error: "Thread not found." }, { status: 404 });
  }

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, id))
    .orderBy(asc(chatMessages.createdAt));

  return Response.json({
    thread,
    messages: rows.map(toUIMessage),
  });
}

function toUIMessage(message: typeof chatMessages.$inferSelect): UIMessage {
  const metadata = normalizeMetadata(message.metadata);
  const parts: UIMessage["parts"] = [];

  if (message.role === "assistant" && metadata.citations?.length) {
    parts.push({
      type: "data-citations",
      id: "citations",
      data: { citations: metadata.citations },
    });
  }

  if (message.role === "assistant" && metadata.reasoning) {
    parts.push({
      type: "reasoning",
      text: metadata.reasoning,
      state: "done",
    });
  }

  parts.push({
    type: "text",
    text: message.content,
    state: "done",
  });

  return {
    id: message.id,
    role: message.role,
    metadata,
    parts,
  };
}

function normalizeMetadata(metadata: Record<string, unknown>): ChatMessageMetadata {
  return metadata as ChatMessageMetadata;
}
