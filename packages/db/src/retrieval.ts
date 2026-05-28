import { and, eq } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm/sql/functions/vector";
import { db } from "./client";
import { documentChunks, documents } from "./schema";

export async function findRelevantChunks(workspaceId: string, embedding: number[], limit = 6) {
  const distance = cosineDistance(documentChunks.embedding, embedding).mapWith(Number);

  return db
    .select({
      id: documentChunks.id,
      documentId: documentChunks.documentId,
      fileName: documents.fileName,
      content: documentChunks.content,
      score: distance,
    })
    .from(documentChunks)
    .innerJoin(documents, eq(documentChunks.documentId, documents.id))
    .where(and(eq(documentChunks.workspaceId, workspaceId), eq(documents.status, "ready")))
    .orderBy(distance)
    .limit(limit);
}
