import { chatFeedback, db, ensureDefaultWorkspace } from "@syntheci/db";
import { chatFeedbackSchema } from "@syntheci/shared";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const input = chatFeedbackSchema.parse(await request.json());

  await db
    .insert(chatFeedback)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      messageId: input.messageId,
      rating: input.rating,
      note: input.note,
    })
    .onConflictDoUpdate({
      target: [chatFeedback.messageId, chatFeedback.workspaceId],
      set: {
        rating: input.rating,
        note: input.note,
      },
    });

  return Response.json({ messageId: input.messageId, rating: input.rating });
}

export async function GET(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const messageId = new URL(request.url).searchParams.get("messageId");

  if (!messageId) {
    return Response.json({ error: "messageId is required" }, { status: 400 });
  }

  const [feedback] = await db.select().from(chatFeedback).where(eq(chatFeedback.messageId, messageId)).limit(1);
  if (!feedback || feedback.workspaceId !== workspaceId) return Response.json({ feedback: null });

  return Response.json({ feedback });
}
