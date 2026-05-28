import {
  db,
  documentChunks,
  documents,
  externalImportBatches,
  maritimeDocumentExtractions,
  maritimeDocuments,
  maritimeEmails,
  maritimeReconciliationFindings,
  maritimeVoyageEvents,
  maritimeVoyageSnapshots,
  operationalJobs,
} from "@syntheci/db";
import { and, eq, inArray } from "drizzle-orm";
import {
  AMS_DORIAN_LIVE_DEMO_VOYAGE_ID,
  AMS_DORIAN_LIVE_DEMO_SOURCE_IDS,
  AMS_DORIAN_LIVE_DEMO_SOURCE_META,
} from "@/lib/live-demo-events";

export async function resetVoyageDemoState(
  workspaceId: string,
  voyageId: string,
  options: { includeLiveSources?: boolean } = {},
) {
  const [jobs, findings, extractions, snapshots] = await Promise.all([
    db
      .delete(operationalJobs)
      .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId)))
      .returning({ id: operationalJobs.id }),
    db
      .delete(maritimeReconciliationFindings)
      .where(and(eq(maritimeReconciliationFindings.workspaceId, workspaceId), eq(maritimeReconciliationFindings.voyageId, voyageId)))
      .returning({ id: maritimeReconciliationFindings.id }),
    db
      .delete(maritimeDocumentExtractions)
      .where(and(eq(maritimeDocumentExtractions.workspaceId, workspaceId), eq(maritimeDocumentExtractions.voyageId, voyageId)))
      .returning({ id: maritimeDocumentExtractions.id }),
    db
      .delete(maritimeVoyageSnapshots)
      .where(and(eq(maritimeVoyageSnapshots.workspaceId, workspaceId), eq(maritimeVoyageSnapshots.voyageId, voyageId)))
      .returning({ id: maritimeVoyageSnapshots.id }),
  ]);

  const deleted = {
    jobs: jobs.length,
    findings: findings.length,
    extractions: extractions.length,
    snapshots: snapshots.length,
    liveSources: 0,
  };

  if (options.includeLiveSources && voyageId === AMS_DORIAN_LIVE_DEMO_VOYAGE_ID) {
    const liveSources = await resetAmsDorianLiveSources(workspaceId);
    deleted.liveSources = liveSources;
  }

  return {
    voyageId,
    deleted,
  };
}

async function resetAmsDorianLiveSources(workspaceId: string) {
  const [events, emails, maritimeDocRows, chunks, docRows, batches] = await Promise.all([
    db
      .delete(maritimeVoyageEvents)
      .where(and(eq(maritimeVoyageEvents.workspaceId, workspaceId), inArray(maritimeVoyageEvents.id, [AMS_DORIAN_LIVE_DEMO_SOURCE_IDS.eventId])))
      .returning({ id: maritimeVoyageEvents.id }),
    db
      .delete(maritimeEmails)
      .where(and(eq(maritimeEmails.workspaceId, workspaceId), inArray(maritimeEmails.id, [AMS_DORIAN_LIVE_DEMO_SOURCE_IDS.emailId])))
      .returning({ id: maritimeEmails.id }),
    db
      .delete(maritimeDocuments)
      .where(and(eq(maritimeDocuments.workspaceId, workspaceId), inArray(maritimeDocuments.documentId, [AMS_DORIAN_LIVE_DEMO_SOURCE_IDS.documentId])))
      .returning({ id: maritimeDocuments.id }),
    db
      .delete(documentChunks)
      .where(and(eq(documentChunks.workspaceId, workspaceId), inArray(documentChunks.documentId, [AMS_DORIAN_LIVE_DEMO_SOURCE_IDS.documentId])))
      .returning({ id: documentChunks.id }),
    db
      .delete(documents)
      .where(and(eq(documents.workspaceId, workspaceId), inArray(documents.id, [AMS_DORIAN_LIVE_DEMO_SOURCE_IDS.documentId])))
      .returning({ id: documents.id }),
    db
      .delete(externalImportBatches)
      .where(and(eq(externalImportBatches.workspaceId, workspaceId), eq(externalImportBatches.id, AMS_DORIAN_LIVE_DEMO_SOURCE_META.batchId)))
      .returning({ id: externalImportBatches.id }),
  ]);

  return events.length + emails.length + maritimeDocRows.length + chunks.length + docRows.length + batches.length;
}
