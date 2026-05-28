import { chatMessages, chatThreads, db, ensureDefaultWorkspace } from "@syntheci/db";
import { desc, eq, inArray } from "drizzle-orm";

export async function GET() {
  const workspaceId = await ensureDefaultWorkspace();
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

  const messages =
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

  const latestByThread = new Map(messages.map((message) => [message.threadId, message]));

  return Response.json({
    threads: threads.map((thread) => {
      const latest = latestByThread.get(thread.id);
      return {
        ...thread,
        lastMessage: latest?.content ?? "",
        lastRole: latest?.role ?? null,
        lastMessageAt: latest?.createdAt ?? thread.updatedAt,
      };
    }),
  });
}
