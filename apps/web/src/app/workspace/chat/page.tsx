import { chatMessages, chatThreads, db, ensureDefaultWorkspace } from "@syntheci/db";
import { asc, and, desc, eq, inArray } from "drizzle-orm";
import { ChatPanel, type ChatThreadSummary, type SyntheciUIMessage } from "./chat-panel";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ChatPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const selectedThreadId = getParam(params.threadId);
  const workspaceId = await ensureDefaultWorkspace();
  const threads = await loadThreads(workspaceId);
  const initialMessages = selectedThreadId ? await loadMessages(selectedThreadId, workspaceId) : [];
  const activeThreadId = selectedThreadId ?? crypto.randomUUID();

  return (
    <ChatPanel
      key={activeThreadId}
      activeThreadId={activeThreadId}
      initialMessages={initialMessages}
      initialThreads={threads}
      selectedThreadId={selectedThreadId}
    />
  );
}

async function loadThreads(workspaceId: string): Promise<ChatThreadSummary[]> {
  const threads = await db
    .select({
      id: chatThreads.id,
      title: chatThreads.title,
      createdAt: chatThreads.createdAt,
      updatedAt: chatThreads.updatedAt,
    })
    .from(chatThreads)
    .where(eq(chatThreads.workspaceId, workspaceId))
    .orderBy(desc(chatThreads.updatedAt))
    .limit(50);

  const latestMessages =
    threads.length > 0
      ? await db
          .select({
            threadId: chatMessages.threadId,
            content: chatMessages.content,
            role: chatMessages.role,
            createdAt: chatMessages.createdAt,
          })
          .from(chatMessages)
          .where(
            inArray(
              chatMessages.threadId,
              threads.map((thread) => thread.id),
            ),
          )
          .orderBy(desc(chatMessages.createdAt))
      : [];
  const latestByThread = new Map(latestMessages.map((message) => [message.threadId, message]));

  return threads.map((thread) => {
    const latest = latestByThread.get(thread.id);
    return {
      id: thread.id,
      title: thread.title,
      updatedAt: thread.updatedAt.toISOString(),
      lastMessage: latest?.content ?? "",
      lastRole: latest?.role ?? null,
      lastMessageAt: (latest?.createdAt ?? thread.updatedAt).toISOString(),
    };
  });
}

async function loadMessages(threadId: string, workspaceId: string): Promise<SyntheciUIMessage[]> {
  const [thread] = await db
    .select({ id: chatThreads.id })
    .from(chatThreads)
    .where(and(eq(chatThreads.id, threadId), eq(chatThreads.workspaceId, workspaceId)))
    .limit(1);

  if (!thread) return [];

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.threadId, threadId))
    .orderBy(asc(chatMessages.createdAt));

  return rows.map((message) => {
    const metadata = normalizeMetadata(message.metadata);
    const parts: SyntheciUIMessage["parts"] = [];

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
  });
}

function normalizeMetadata(metadata: Record<string, unknown>): NonNullable<SyntheciUIMessage["metadata"]> {
  return metadata as NonNullable<SyntheciUIMessage["metadata"]>;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}
