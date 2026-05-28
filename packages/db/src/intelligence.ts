import { and, eq } from "drizzle-orm";
import type {
  DocumentExtractionDraft,
  ReconciliationFindingDraft,
  VoyageSnapshotDraft,
} from "@syntheci/shared";
import { db } from "./client";
import {
  maritimeDocumentExtractions,
  maritimeReconciliationFindings,
  maritimeVoyageSnapshots,
} from "./schema";

export async function persistDocumentExtractions(workspaceId: string, extractions: DocumentExtractionDraft[]) {
  const now = new Date();
  for (const extraction of extractions) {
    await db
      .insert(maritimeDocumentExtractions)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        documentId: extraction.documentId,
        voyageId: extraction.voyageId,
        vesselName: extraction.vesselName,
        documentType: extraction.documentType,
        fields: extraction.fields,
        confidence: extraction.confidence,
        status: extraction.status,
        evidence: extraction.evidence,
        raw: extraction,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [maritimeDocumentExtractions.workspaceId, maritimeDocumentExtractions.documentId],
        set: {
          voyageId: extraction.voyageId,
          vesselName: extraction.vesselName,
          documentType: extraction.documentType,
          fields: extraction.fields,
          confidence: extraction.confidence,
          status: extraction.status,
          evidence: extraction.evidence,
          raw: extraction,
          updatedAt: now,
        },
      });
  }

  return maritimeDocumentExtractionsForVoyages(workspaceId, [...new Set(extractions.map((extraction) => extraction.voyageId))]);
}

export async function persistReconciliationFindings(workspaceId: string, findings: ReconciliationFindingDraft[]) {
  const now = new Date();
  for (const finding of findings) {
    await db
      .insert(maritimeReconciliationFindings)
      .values({
        id: crypto.randomUUID(),
        workspaceId,
        voyageId: finding.voyageId,
        findingType: finding.findingType,
        severity: finding.severity,
        confidence: finding.confidence,
        title: finding.title,
        summary: finding.summary,
        evidence: finding.evidence,
        suggestedAction: finding.suggestedAction,
        payload: finding.payload,
        status: "open",
        raw: finding,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [
          maritimeReconciliationFindings.workspaceId,
          maritimeReconciliationFindings.voyageId,
          maritimeReconciliationFindings.findingType,
          maritimeReconciliationFindings.title,
        ],
        set: {
          severity: finding.severity,
          confidence: finding.confidence,
          summary: finding.summary,
          evidence: finding.evidence,
          suggestedAction: finding.suggestedAction,
          payload: finding.payload,
          raw: finding,
          updatedAt: now,
        },
      });
  }

  return maritimeReconciliationFindingsForVoyage(workspaceId, findings[0]?.voyageId);
}

export async function persistVoyageSnapshot(workspaceId: string, snapshot: VoyageSnapshotDraft) {
  const now = new Date();
  await db
    .insert(maritimeVoyageSnapshots)
    .values({
      id: crypto.randomUUID(),
      workspaceId,
      voyageId: snapshot.voyageId,
      stateHash: snapshot.stateHash,
      state: snapshot.state,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [maritimeVoyageSnapshots.workspaceId, maritimeVoyageSnapshots.voyageId],
      set: {
        stateHash: snapshot.stateHash,
        state: snapshot.state,
        updatedAt: now,
      },
    });
}

export async function loadVoyageSnapshot(workspaceId: string, voyageId: string) {
  const [snapshot] = await db
    .select()
    .from(maritimeVoyageSnapshots)
    .where(and(eq(maritimeVoyageSnapshots.workspaceId, workspaceId), eq(maritimeVoyageSnapshots.voyageId, voyageId)))
    .limit(1);
  return snapshot ?? null;
}

async function maritimeDocumentExtractionsForVoyages(workspaceId: string, voyageIds: string[]) {
  if (voyageIds.length === 0) return [];
  const rows = await Promise.all(
    voyageIds.map((voyageId) =>
      db
        .select()
        .from(maritimeDocumentExtractions)
        .where(and(eq(maritimeDocumentExtractions.workspaceId, workspaceId), eq(maritimeDocumentExtractions.voyageId, voyageId))),
    ),
  );
  return rows.flat();
}

async function maritimeReconciliationFindingsForVoyage(workspaceId: string, voyageId: string | undefined) {
  if (!voyageId) return [];
  return db
    .select()
    .from(maritimeReconciliationFindings)
    .where(and(eq(maritimeReconciliationFindings.workspaceId, workspaceId), eq(maritimeReconciliationFindings.voyageId, voyageId)));
}
