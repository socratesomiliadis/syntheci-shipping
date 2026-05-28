import { ingestionQueue } from "@/lib/queues";
import { db, documents, ensureDefaultWorkspace, queueJobs } from "@syntheci/db";
import { enqueueIngestionSchema, QUEUES } from "@syntheci/shared";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  const { documentId } = enqueueIngestionSchema.parse(await request.json());
  const workspaceId = await ensureDefaultWorkspace();
  const [document] = await db.select().from(documents).where(eq(documents.id, documentId)).limit(1);

  if (!document) {
    return Response.json({ error: "Document not found" }, { status: 404 });
  }

  const queue = ingestionQueue();
  const job = await queue.add("ingest-document", {
    documentId,
    workspaceId,
    objectKey: document.objectKey,
    fileName: document.fileName,
    contentType: document.contentType,
  });

  await db.update(documents).set({ status: "queued", updatedAt: new Date() }).where(eq(documents.id, documentId));
  await db.insert(queueJobs).values({
    id: crypto.randomUUID(),
    queueName: QUEUES.ingestion,
    jobId: String(job.id),
    workspaceId,
    documentId,
    status: "queued",
    payload: job.data,
  });

  return Response.json({ jobId: job.id });
}
