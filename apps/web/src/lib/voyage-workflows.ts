import {
  chatFeedback,
  db,
  documents,
  findRelevantChunks,
  loadVoyageSnapshot,
  maritimeAisPositions,
  maritimeBunkerReports,
  maritimeComplianceFlags,
  maritimeDocumentExtractions,
  maritimeDocuments,
  maritimeEmails,
  maritimeEmbeddingChunks,
  maritimeReconciliationFindings,
  maritimeVoyageEvents,
  maritimeVoyages,
  persistReconciliationFindings,
  operationalJobs,
} from "@syntheci/db";
import { embedTexts, generateVoyageIntelligence } from "@syntheci/ai";
import {
  buildClaimsEvidencePack,
  buildClaimsPackSummary,
  buildAuditChecks,
  buildReconciliationFindings,
  buildTimeline,
  buildWatchlistJobs,
  buildVoyageSnapshot,
  compareVoyageSnapshots,
  comparePdaFda,
  detectMissingDocuments,
  detectPaymentRisk,
  draftCitedReply,
  draftReply,
  extractDocumentFields,
  extractCharterpartyClauses,
  scoreSourceConfidence,
  type WorkflowContext,
  type WorkflowJobDraft,
} from "@syntheci/shared";
import { and, asc, desc, eq, ilike, ne, or } from "drizzle-orm";

export type VoyageSummary = {
  id: string;
  vesselName: string;
  originPort: string;
  destinationPort: string;
  cargo: string;
  eta: string;
  status: string;
  riskLevel: string | null;
  riskScore: number | null;
  openJobs: number;
  missingDocuments: number;
};

export async function loadVoyageSummaries(workspaceId: string, query = ""): Promise<VoyageSummary[]> {
  const where = query
    ? and(
        eq(maritimeVoyages.workspaceId, workspaceId),
        or(
          ilike(maritimeVoyages.id, `%${query}%`),
          ilike(maritimeVoyages.vesselName, `%${query}%`),
          ilike(maritimeVoyages.originPort, `%${query}%`),
          ilike(maritimeVoyages.destinationPort, `%${query}%`),
          ilike(maritimeVoyages.cargo, `%${query}%`),
        ),
      )
    : eq(maritimeVoyages.workspaceId, workspaceId);

  const [voyages, flags, jobs] = await Promise.all([
    db
      .select()
      .from(maritimeVoyages)
      .where(where)
      .orderBy(asc(maritimeVoyages.eta), asc(maritimeVoyages.id))
      .limit(100),
    db.select().from(maritimeComplianceFlags).where(eq(maritimeComplianceFlags.workspaceId, workspaceId)),
    db
      .select()
      .from(operationalJobs)
      .where(and(eq(operationalJobs.workspaceId, workspaceId), ne(operationalJobs.status, "resolved"), ne(operationalJobs.status, "dismissed"))),
  ]);

  const flagByVoyage = new Map(flags.map((flag) => [flag.voyageId, flag]));
  const jobsByVoyage = groupBy(jobs, (job) => job.voyageId);

  return voyages.map((voyage) => {
    const voyageJobs = jobsByVoyage.get(voyage.id) ?? [];
    return {
      id: voyage.id,
      vesselName: voyage.vesselName,
      originPort: voyage.originPort,
      destinationPort: voyage.destinationPort,
      cargo: voyage.cargo,
      eta: voyage.eta,
      status: voyage.status,
      riskLevel: flagByVoyage.get(voyage.id)?.riskLevel ?? null,
      riskScore: flagByVoyage.get(voyage.id)?.riskScore ?? null,
      openJobs: voyageJobs.length,
      missingDocuments: voyageJobs.filter((job) => job.jobType === "missing_document").length,
    };
  });
}

export async function loadVoyageCockpit(workspaceId: string, voyageId: string) {
  const context = await loadWorkflowContext(workspaceId, voyageId);
  const intelligenceFindings = buildReconciliationFindings(context);
  const auditChecks = buildAuditChecks(context, intelligenceFindings);
  const citedDraftReply = draftCitedReply(context, intelligenceFindings);
  const claimsPackSummary = buildClaimsPackSummary(context);
  const sourceConfidence = buildSourceConfidence(context);
  const currentSnapshot = buildVoyageSnapshot(context, intelligenceFindings);

  const [jobs, threadSummaries, persistedExtractions, persistedFindings, previousSnapshot] = await Promise.all([
    db
      .select()
      .from(operationalJobs)
      .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId)))
      .orderBy(desc(operationalJobs.createdAt)),
    db
      .select({
        id: maritimeEmbeddingChunks.id,
        sourceId: maritimeEmbeddingChunks.sourceId,
        entityName: maritimeEmbeddingChunks.entityName,
        content: maritimeEmbeddingChunks.content,
        chunkIndex: maritimeEmbeddingChunks.chunkIndex,
      })
      .from(maritimeEmbeddingChunks)
      .where(
        and(
          eq(maritimeEmbeddingChunks.workspaceId, workspaceId),
          eq(maritimeEmbeddingChunks.relatedVoyageId, voyageId),
          eq(maritimeEmbeddingChunks.sourceType, "email_thread"),
        ),
      )
      .orderBy(asc(maritimeEmbeddingChunks.sourceId), asc(maritimeEmbeddingChunks.chunkIndex)),
    db
      .select()
      .from(maritimeDocumentExtractions)
      .where(and(eq(maritimeDocumentExtractions.workspaceId, workspaceId), eq(maritimeDocumentExtractions.voyageId, voyageId)))
      .orderBy(desc(maritimeDocumentExtractions.updatedAt)),
    db
      .select()
      .from(maritimeReconciliationFindings)
      .where(and(eq(maritimeReconciliationFindings.workspaceId, workspaceId), eq(maritimeReconciliationFindings.voyageId, voyageId)))
      .orderBy(desc(maritimeReconciliationFindings.updatedAt)),
    loadVoyageSnapshot(workspaceId, voyageId),
  ]);

  return {
    context,
    timeline: buildTimeline(context),
    missingDocumentDrafts: detectMissingDocuments(context),
    watchlistDrafts: buildWatchlistJobs(context),
    charterpartyClauses: extractCharterpartyClauses(context),
    draftReply: draftReply(context),
    pdaFdaDrafts: comparePdaFda(context),
    claimsPackDrafts: buildClaimsEvidencePack(context),
    paymentRiskDrafts: detectPaymentRisk(context),
    documentExtractions: persistedExtractions.length ? persistedExtractions : extractDocumentFields(context),
    reconciliationFindings: persistedFindings,
    auditChecks,
    citedDraftReply,
    claimsPackSummary,
    sourceConfidence,
    currentSnapshot,
    snapshotChanges: compareVoyageSnapshots(context, previousSnapshot),
    actionPlanDrafts: [],
    jobs,
    threadSummaries: groupThreadSummaries(threadSummaries),
  };
}

export async function loadWorkflowContext(workspaceId: string, voyageId: string): Promise<WorkflowContext> {
  const [voyage] = await db
    .select()
    .from(maritimeVoyages)
    .where(and(eq(maritimeVoyages.workspaceId, workspaceId), eq(maritimeVoyages.id, voyageId)))
    .limit(1);

  if (!voyage) {
    throw new Error("Voyage not found");
  }

  const [documentRows, emails, events, flags, aisPositions, bunkerReports] = await Promise.all([
    db
      .select({
        id: maritimeDocuments.documentId,
        fileName: maritimeDocuments.fileName,
        documentType: maritimeDocuments.documentType,
        sourceCreatedAt: maritimeDocuments.sourceCreatedAt,
        content: maritimeDocuments.content,
      })
      .from(maritimeDocuments)
      .innerJoin(documents, eq(documents.id, maritimeDocuments.documentId))
      .where(and(eq(maritimeDocuments.workspaceId, workspaceId), eq(maritimeDocuments.relatedVoyageId, voyageId))),
    db
      .select()
      .from(maritimeEmails)
      .where(and(eq(maritimeEmails.workspaceId, workspaceId), eq(maritimeEmails.relatedVoyageId, voyageId)))
      .orderBy(desc(maritimeEmails.sentAt)),
    db
      .select()
      .from(maritimeVoyageEvents)
      .where(and(eq(maritimeVoyageEvents.workspaceId, workspaceId), eq(maritimeVoyageEvents.voyageId, voyageId)))
      .orderBy(desc(maritimeVoyageEvents.eventTime)),
    db
      .select()
      .from(maritimeComplianceFlags)
      .where(and(eq(maritimeComplianceFlags.workspaceId, workspaceId), eq(maritimeComplianceFlags.voyageId, voyageId)))
      .limit(1),
    db
      .select()
      .from(maritimeAisPositions)
      .where(and(eq(maritimeAisPositions.workspaceId, workspaceId), eq(maritimeAisPositions.voyageId, voyageId)))
      .orderBy(desc(maritimeAisPositions.positionTimestamp))
      .limit(12),
    db
      .select()
      .from(maritimeBunkerReports)
      .where(and(eq(maritimeBunkerReports.workspaceId, workspaceId), eq(maritimeBunkerReports.voyageId, voyageId))),
  ]);

  return {
    voyage: {
      id: voyage.id,
      vesselName: voyage.vesselName,
      originPort: voyage.originPort,
      destinationPort: voyage.destinationPort,
      cargo: voyage.cargo,
      laycanStart: voyage.laycanStart,
      laycanEnd: voyage.laycanEnd,
      etd: voyage.etd,
      eta: voyage.eta,
      status: voyage.status,
    },
    documents: documentRows,
    emails: emails.map((email) => ({
      id: email.id,
      threadId: email.threadId,
      subject: email.subject,
      from: email.from,
      sentAt: email.sentAt,
      body: email.body,
      attachments: email.attachments,
    })),
    events: events.map((event) => ({
      id: event.id,
      eventType: event.eventType,
      eventTime: event.eventTime,
      location: event.location,
      severity: event.severity,
      description: event.description,
    })),
    complianceFlag: flags[0]
      ? {
          id: flags[0].id,
          euEtsExposure: flags[0].euEtsExposure,
          fueleuRisk: flags[0].fueleuRisk,
          mrvMissingData: flags[0].mrvMissingData,
          ciiRisk: flags[0].ciiRisk,
          riskScore: flags[0].riskScore,
          riskLevel: flags[0].riskLevel,
          rationale: flags[0].rationale,
          lastEvaluatedAt: flags[0].lastEvaluatedAt,
        }
      : null,
    aisPositions: aisPositions.map((position) => ({
      id: position.id,
      positionTimestamp: position.positionTimestamp,
      destination: position.destination,
      eta: position.eta,
      speedKnots: position.speedKnots,
    })),
    bunkerReports: bunkerReports.map((report) => ({
      id: report.id,
      vessel: report.vessel,
      voyageId: report.voyageId,
      fuelType: report.fuelType,
      quantityMt: report.quantityMt,
      sulfurPct: report.sulfurPct,
      co2Factor: report.co2Factor,
      port: report.port,
      supplier: report.supplier,
      invoiceDate: report.invoiceDate,
    })),
  };
}

export async function persistWorkflowJobs(workspaceId: string, voyageId: string, drafts: WorkflowJobDraft[]) {
  if (drafts.length === 0) return [];

  const existing = await db
    .select()
    .from(operationalJobs)
    .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId)));
  const existingKeys = new Set(existing.map((job) => workflowJobKey(job.jobType, job.title)));
  const now = new Date();
  const insertable = drafts.filter((draft) => !existingKeys.has(workflowJobKey(draft.jobType, draft.title)));

  if (insertable.length === 0) return existing;

  await db.insert(operationalJobs).values(
    insertable.map((draft) => ({
      id: crypto.randomUUID(),
      workspaceId,
      voyageId,
      jobType: draft.jobType,
      priority: draft.priority,
      status: "open" as const,
      title: draft.title,
      summary: draft.summary,
      evidence: draft.evidence,
      payload: draft.payload,
      createdAt: now,
      updatedAt: now,
    })),
  );

  return db
    .select()
    .from(operationalJobs)
    .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId)))
    .orderBy(desc(operationalJobs.createdAt));
}

export async function generateWorkflow(workspaceId: string, voyageId: string, workflow: string) {
  const context = await loadWorkflowContext(workspaceId, voyageId);
  if (isSupportedWorkflow(workflow)) return generateAiWorkflow(workspaceId, context, workflow);
  throw new Error(`Unsupported workflow: ${workflow}`);
}

export async function loadOperationalJobs(workspaceId: string, status?: string, voyageId?: string) {
  const clauses = [
    eq(operationalJobs.workspaceId, workspaceId),
    status ? eq(operationalJobs.status, status as "open" | "in_progress" | "resolved" | "dismissed") : undefined,
    voyageId ? eq(operationalJobs.voyageId, voyageId) : undefined,
  ].filter(Boolean);

  return db
    .select()
    .from(operationalJobs)
    .where(and(...clauses))
    .orderBy(desc(operationalJobs.createdAt))
    .limit(100);
}

export async function loadAdminSourceHealth(workspaceId: string) {
  const [fileRows, emailRows, profileRows, failedRows, jobRows, feedbackRows, extractionRows, findingRows] = await Promise.all([
    db.select().from(documents).where(eq(documents.workspaceId, workspaceId)),
    db.select().from(maritimeEmails).where(eq(maritimeEmails.workspaceId, workspaceId)),
    db.select().from(maritimeEmbeddingChunks).where(eq(maritimeEmbeddingChunks.workspaceId, workspaceId)),
    db.select().from(documents).where(and(eq(documents.workspaceId, workspaceId), eq(documents.status, "failed"))),
    db.select().from(operationalJobs).where(eq(operationalJobs.workspaceId, workspaceId)),
    db.select().from(chatFeedback).where(eq(chatFeedback.workspaceId, workspaceId)),
    db.select().from(maritimeDocumentExtractions).where(eq(maritimeDocumentExtractions.workspaceId, workspaceId)),
    db.select().from(maritimeReconciliationFindings).where(eq(maritimeReconciliationFindings.workspaceId, workspaceId)),
  ]);

  const readyFiles = fileRows.filter((file) => file.status === "ready").length;
  const staleFiles = fileRows.filter((file) => file.status !== "ready").length;
  return {
    totals: {
      files: fileRows.length,
      readyFiles,
      staleFiles,
      emails: emailRows.length,
      profileChunks: profileRows.length,
      failedFiles: failedRows.length,
      operationalJobs: jobRows.length,
      feedback: feedbackRows.length,
      extractions: extractionRows.length,
      findings: findingRows.length,
    },
    failedFiles: failedRows,
    openJobs: jobRows.filter((job) => job.status === "open").slice(0, 20),
  };
}

export async function voyageIdsForWorkspace(workspaceId: string) {
  const rows = await db
    .select({ id: maritimeVoyages.id })
    .from(maritimeVoyages)
    .where(eq(maritimeVoyages.workspaceId, workspaceId))
    .orderBy(asc(maritimeVoyages.id));
  return rows.map((row) => row.id);
}

function groupThreadSummaries(rows: { sourceId: string; entityName: string | null; content: string; chunkIndex: number }[]) {
  return [...groupBy(rows, (row) => row.sourceId).entries()].map(([threadId, chunks]) => ({
    threadId,
    title: chunks[0]?.entityName ?? threadId,
    content: chunks
      .sort((left, right) => left.chunkIndex - right.chunkIndex)
      .map((chunk) => chunk.content)
      .join("\n\n"),
  }));
}

async function generateAiWorkflow(workspaceId: string, context: WorkflowContext, workflow: string) {
  const query = buildVoyageRetrievalQuery(context, workflow);
  const [embedding] = await embedTexts([query], "query");
  const retrievedChunks = embedding ? await findRelevantChunks(workspaceId, embedding, 10, query) : [];
  const intelligence = await generateVoyageIntelligence({ context, retrievedChunks, workflow });
  await persistReconciliationFindings(workspaceId, intelligence.findings);
  return persistWorkflowJobs(workspaceId, context.voyage.id, intelligence.jobs);
}

function buildSourceConfidence(context: WorkflowContext) {
  return [
    ...context.documents.map((document) => ({
      ...scoreSourceConfidence("file", document.documentType),
      sourceId: document.id,
      sourceType: "file",
      label: document.fileName,
      documentType: document.documentType,
    })),
    ...context.emails.slice(0, 8).map((email) => ({
      ...scoreSourceConfidence("email", "email"),
      sourceId: email.id,
      sourceType: "email",
      label: email.subject,
      documentType: "email",
    })),
    ...(context.complianceFlag
      ? [{
          ...scoreSourceConfidence("structured_record", "compliance_flag"),
          sourceId: context.complianceFlag.id,
          sourceType: "compliance_flag",
          label: `${context.complianceFlag.riskLevel} compliance risk`,
          documentType: "compliance_flag",
        }]
      : []),
    ...context.aisPositions.slice(0, 3).map((position) => ({
      ...scoreSourceConfidence("structured_record", "ais_position"),
      sourceId: position.id,
      sourceType: "structured_record",
      label: `AIS ${position.destination}`,
      documentType: "ais_position",
    })),
  ].sort((left, right) => right.score - left.score);
}

function workflowJobKey(jobType: string, title: string) {
  return `${jobType}:${title.toLowerCase()}`;
}

function isSupportedWorkflow(workflow: string) {
  return [
    "all",
    "missing-documents",
    "watchlist",
    "pda-fda",
    "claims-pack",
    "payment-risk",
    "reconciliation",
    "change-monitor",
    "audit",
    "action-plan",
  ].includes(workflow);
}

function buildVoyageRetrievalQuery(context: WorkflowContext, workflow: string) {
  return [
    context.voyage.id,
    context.voyage.vesselName,
    context.voyage.originPort,
    context.voyage.destinationPort,
    context.voyage.cargo,
    workflow,
    "operational risk evidence missing documents payment claims compliance AIS bunker voyage changes",
  ]
    .filter(Boolean)
    .join(" ");
}

function groupBy<T, K>(values: T[], keyFor: (value: T) => K) {
  const groups = new Map<K, T[]>();
  for (const value of values) {
    const key = keyFor(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return groups;
}
