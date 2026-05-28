import {
  db,
  documentChunks,
  documents,
  ensureDefaultWorkspace,
  externalImportBatches,
  maritimeAisPositions,
  maritimeDocuments,
  maritimeEmailChunks,
  maritimeEmails,
  maritimeEmbeddingChunks,
} from "@syntheci/db";
import { buildEmailEmbeddingChunks, buildStructuredRecordChunk, chunkDocumentForEmbedding, embedTexts } from "@syntheci/ai";
import { externalImportPayloadSchema } from "@syntheci/shared";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const workspaceId = await ensureDefaultWorkspace();
  const input = externalImportPayloadSchema.parse(await request.json());
  const batchId = crypto.randomUUID();
  const now = new Date();
  const summary = {
    emails: input.emails.length,
    documents: input.documents.length,
    aisPositions: input.aisPositions.length,
    financeRecords: input.financeRecords.length,
  };

  await db.insert(externalImportBatches).values({
    id: batchId,
    workspaceId,
    provider: input.provider,
    sourceType: input.sourceType,
    status: "completed",
    summary,
    raw: input,
    updatedAt: now,
  });

  for (const email of input.emails) {
    await upsertEmail(workspaceId, email, now);
  }
  for (const document of input.documents) {
    await upsertDocument(workspaceId, document, input.provider, now);
  }
  for (const position of input.aisPositions) {
    await upsertAisPosition(workspaceId, position, now);
  }
  for (const record of input.financeRecords) {
    await upsertFinanceRecord(workspaceId, record, input.provider, now);
  }

  return Response.json({ batchId, summary }, { status: 201 });
}

async function upsertEmail(
  workspaceId: string,
  email: {
    id: string;
    threadId: string;
    subject: string;
    from: string;
    to: string[];
    cc: string[];
    sentAt: string;
    body: string;
    relatedVoyageId: string;
    relatedVesselName: string;
    attachments: Record<string, unknown>[];
  },
  now: Date,
) {
  await db
    .insert(maritimeEmails)
    .values({
      id: email.id,
      workspaceId,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      to: email.to,
      cc: email.cc,
      sentAt: email.sentAt,
      body: email.body,
      relatedVoyageId: email.relatedVoyageId,
      relatedVesselName: email.relatedVesselName,
      attachments: email.attachments,
      raw: email,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeEmails.id,
      set: {
        threadId: email.threadId,
        subject: email.subject,
        from: email.from,
        to: email.to,
        cc: email.cc,
        sentAt: email.sentAt,
        body: email.body,
        relatedVoyageId: email.relatedVoyageId,
        relatedVesselName: email.relatedVesselName,
        attachments: email.attachments,
        raw: email,
        updatedAt: now,
      },
    });

  const chunks = buildEmailEmbeddingChunks({
    email_id: email.id,
    thread_id: email.threadId,
    subject: email.subject,
    from: email.from,
    to: email.to,
    cc: email.cc,
    date: email.sentAt,
    body: email.body,
    related_voyage_id: email.relatedVoyageId,
    related_vessel_name: email.relatedVesselName,
    attachments: email.attachments,
  });
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content), "document");
  await db.delete(maritimeEmailChunks).where(eq(maritimeEmailChunks.emailId, email.id));
  if (chunks.length > 0) {
    await db.insert(maritimeEmailChunks).values(chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      emailId: email.id,
      workspaceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate,
      embedding: embeddings[index],
      metadata: { provider: "external-import" },
    })));
  }
}

async function upsertDocument(
  workspaceId: string,
  document: {
    id: string;
    fileName: string;
    content: string;
    contentType: string;
    documentType: string;
    relatedVoyageId: string;
    relatedVesselName: string;
    sourceEmailId: string;
    sourceAttachmentId: string;
    originalAttachmentFilename?: string;
    sourceCreatedAt: string;
  },
  provider: string,
  now: Date,
) {
  const objectKey = `external-import/${provider}/${document.id}/${document.fileName}`;
  await db
    .insert(documents)
    .values({
      id: document.id,
      workspaceId,
      fileName: document.fileName,
      objectKey,
      contentType: document.contentType,
      sizeBytes: Buffer.byteLength(document.content),
      status: "ready",
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: documents.id,
      set: {
        workspaceId,
        fileName: document.fileName,
        objectKey,
        contentType: document.contentType,
        sizeBytes: Buffer.byteLength(document.content),
        status: "ready",
        error: null,
        updatedAt: now,
      },
    });

  await db
    .insert(maritimeDocuments)
    .values({
      id: `external-${document.id}`,
      workspaceId,
      documentId: document.id,
      fileName: document.fileName,
      path: objectKey,
      documentType: document.documentType,
      relatedVoyageId: document.relatedVoyageId,
      relatedVesselName: document.relatedVesselName,
      sourceEmailId: document.sourceEmailId,
      sourceAttachmentId: document.sourceAttachmentId,
      originalAttachmentFilename: document.originalAttachmentFilename ?? document.fileName,
      sourceCreatedAt: document.sourceCreatedAt,
      frontMatter: {},
      content: document.content,
      raw: document,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeDocuments.id,
      set: {
        workspaceId,
        documentId: document.id,
        fileName: document.fileName,
        path: objectKey,
        documentType: document.documentType,
        relatedVoyageId: document.relatedVoyageId,
        relatedVesselName: document.relatedVesselName,
        sourceEmailId: document.sourceEmailId,
        sourceAttachmentId: document.sourceAttachmentId,
        originalAttachmentFilename: document.originalAttachmentFilename ?? document.fileName,
        sourceCreatedAt: document.sourceCreatedAt,
        content: document.content,
        raw: document,
        updatedAt: now,
      },
    });

  const chunks = chunkDocumentForEmbedding(document.content, {
    documentId: document.id,
    documentType: document.documentType,
    fileName: document.fileName,
    relatedVoyageId: document.relatedVoyageId,
    relatedVesselName: document.relatedVesselName,
  });
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.content), "document");
  await db.delete(documentChunks).where(eq(documentChunks.documentId, document.id));
  if (chunks.length > 0) {
    await db.insert(documentChunks).values(chunks.map((chunk, index) => ({
      id: crypto.randomUUID(),
      documentId: document.id,
      workspaceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate,
      embedding: embeddings[index],
      metadata: {
        fileName: document.fileName,
        contentType: document.contentType,
        provider,
      },
    })));
  }
}

async function upsertAisPosition(
  workspaceId: string,
  position: {
    id: string;
    voyageId: string;
    vesselName: string;
    lat: number;
    lng: number;
    speedKnots: number;
    heading: number;
    positionTimestamp: string;
    destination: string;
    eta: string;
  },
  now: Date,
) {
  await db
    .insert(maritimeAisPositions)
    .values({ ...position, workspaceId, raw: position, updatedAt: now })
    .onConflictDoUpdate({
      target: maritimeAisPositions.id,
      set: { ...position, raw: position, updatedAt: now },
    });
}

async function upsertFinanceRecord(
  workspaceId: string,
  record: {
    id: string;
    voyageId: string;
    vesselName: string;
    recordType: string;
    amount?: number;
    currency?: string;
    status?: string;
    description: string;
    raw: Record<string, unknown>;
  },
  provider: string,
  now: Date,
) {
  const chunk = buildStructuredRecordChunk(
    record.recordType,
    record.id,
    [
      `Finance record: ${record.id}`,
      `Type: ${record.recordType}`,
      `Voyage: ${record.voyageId}`,
      `Vessel: ${record.vesselName}`,
      record.amount ? `Amount: ${record.currency ?? ""} ${record.amount}` : undefined,
      record.status ? `Status: ${record.status}` : undefined,
      record.description,
    ].filter(Boolean).join("\n"),
    {
      voyageId: record.voyageId,
      vesselName: record.vesselName,
      entityName: record.id,
      provider,
      raw: record.raw,
    },
  );
  const [embedding] = await embedTexts([chunk.content], "document");
  await db
    .insert(maritimeEmbeddingChunks)
    .values({
      id: `external-finance-${record.id}`,
      workspaceId,
      sourceType: chunk.sourceType,
      sourceId: chunk.sourceId,
      chunkIndex: chunk.index,
      content: chunk.content,
      tokenEstimate: chunk.tokenEstimate,
      embedding,
      relatedVoyageId: chunk.relatedVoyageId,
      relatedVesselName: chunk.relatedVesselName,
      recordType: chunk.recordType,
      entityName: chunk.entityName,
      metadata: chunk.metadata ?? {},
      createdAt: now,
    })
    .onConflictDoUpdate({
      target: maritimeEmbeddingChunks.id,
      set: {
        content: chunk.content,
        tokenEstimate: chunk.tokenEstimate,
        embedding,
        relatedVoyageId: chunk.relatedVoyageId,
        relatedVesselName: chunk.relatedVesselName,
        recordType: chunk.recordType,
        entityName: chunk.entityName,
        metadata: chunk.metadata ?? {},
      },
    });
}
