import { createUploadUrl } from "@/lib/storage";
import { db, documents, ensureDefaultWorkspace } from "@syntheci/db";
import { createDocumentSchema } from "@syntheci/shared";

export async function POST(request: Request) {
  const input = createDocumentSchema.parse(await request.json());
  const workspaceId = await ensureDefaultWorkspace();
  const documentId = crypto.randomUUID();
  const objectKey = `${workspaceId}/${documentId}/${input.fileName}`;
  const uploadUrl = await createUploadUrl({
    objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
  });

  await db.insert(documents).values({
    id: documentId,
    workspaceId,
    fileName: input.fileName,
    objectKey,
    contentType: input.contentType,
    sizeBytes: input.sizeBytes,
    status: "uploaded",
  });

  return Response.json({ documentId, objectKey, uploadUrl });
}
