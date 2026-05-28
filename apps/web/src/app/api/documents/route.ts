import { db, documents, ensureDefaultWorkspace } from "@syntheci/db";
import { desc, eq } from "drizzle-orm";

export async function GET() {
  const workspaceId = await ensureDefaultWorkspace();
  const rows = await db
    .select()
    .from(documents)
    .where(eq(documents.workspaceId, workspaceId))
    .orderBy(desc(documents.createdAt))
    .limit(50);

  return Response.json({ documents: rows });
}
