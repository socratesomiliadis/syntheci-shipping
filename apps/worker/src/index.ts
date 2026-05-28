import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import {
  buildCitationBlock,
  chunkDocumentForEmbedding,
  draftAutomationBrief,
  embedTexts,
  extractTextFromDocument,
  generateVoyageIntelligence,
} from "@syntheci/ai";
import {
  automationRuns,
  db,
  documentChunks,
  documents,
  findRelevantChunks,
  maritimeAisPositions,
  maritimeBunkerReports,
  maritimeComplianceFlags,
  maritimeDocuments,
  maritimeEmails,
  maritimeVoyageEvents,
  maritimeVoyages,
  operationalJobs,
  loadVoyageSnapshot,
  persistDocumentExtractions,
  persistReconciliationFindings,
  persistVoyageSnapshot,
} from "@syntheci/db";
import {
  automationQueueJobSchema,
  automationJobSchema,
  buildAiActionPlanJobs,
  buildWatchlistJobs,
  buildAuditChecks,
  buildReconciliationFindings,
  buildVoyageSnapshot,
  compareVoyageSnapshots,
  comparePdaFda,
  detectMissingDocuments,
  detectPaymentRisk,
  buildClaimsEvidencePack,
  extractDocumentFields,
  getServerEnv,
  ingestionJobSchema,
  QUEUES,
  type AutomationJob,
  type AutomationQueueJob,
  type IngestionJob,
  type WorkflowAutomationJob,
  type WorkflowContext,
  type WorkflowJobDraft,
} from "@syntheci/shared";
import { Job, QueueEvents, Worker } from "bullmq";
import { and, desc, eq, ne } from "drizzle-orm";

const env = getServerEnv();
const redis = redisConnectionOptions(env.REDIS_URL);
const s3 = new S3Client({
  region: "us-east-1",
  endpoint: env.S3_ENDPOINT,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
  },
});

const ingestionWorker = new Worker(
  QUEUES.ingestion,
  async (job: Job<IngestionJob>) => {
    const payload = ingestionJobSchema.parse(job.data);
    await processIngestion(payload);
  },
  { connection: redis, concurrency: 2 },
);

const automationWorker = new Worker(
  QUEUES.automation,
  async (job: Job<AutomationQueueJob>) => {
    const payload = automationQueueJobSchema.parse(job.data);
    if (payload.kind === "workflow") {
      await processWorkflowAutomation(payload);
      return;
    }
    if (payload.kind === "document-extraction" || payload.kind === "voyage-reconciliation" || payload.kind === "voyage-change-monitor" || payload.kind === "audit-check") {
      await processIntelligenceJob(payload);
      return;
    }
    await processAutomation(automationJobSchema.parse(payload));
  },
  { connection: redis, concurrency: 2 },
);

for (const queueName of [QUEUES.ingestion, QUEUES.automation]) {
  const events = new QueueEvents(queueName, { connection: redis });
  events.on("failed", ({ jobId, failedReason }) => {
    console.error(`[${queueName}] ${jobId} failed: ${failedReason}`);
  });
}

async function processIngestion(payload: IngestionJob) {
  await db
    .update(documents)
    .set({ status: "processing", error: null, updatedAt: new Date() })
    .where(eq(documents.id, payload.documentId));

  try {
    const object = await s3.send(
      new GetObjectCommand({
        Bucket: env.S3_BUCKET,
        Key: payload.objectKey,
      }),
    );

    const bytes = await objectBodyToBytes(object.Body);
    const text = await extractTextFromDocument({
      bytes,
      contentType: payload.contentType,
      fileName: payload.fileName,
    });
    const chunks = chunkDocumentForEmbedding(text, {
      documentId: payload.documentId,
      fileName: payload.fileName,
    });
    const embeddings = await embedTexts(
      chunks.map((chunk) => chunk.content),
      "document",
    );

    await db.delete(documentChunks).where(eq(documentChunks.documentId, payload.documentId));

    if (chunks.length > 0) {
      await db.insert(documentChunks).values(
        chunks.map((chunk, index) => ({
          id: crypto.randomUUID(),
          documentId: payload.documentId,
          workspaceId: payload.workspaceId,
          chunkIndex: chunk.index,
          content: chunk.content,
          tokenEstimate: chunk.tokenEstimate,
          embedding: embeddings[index],
          metadata: {
            fileName: payload.fileName,
            contentType: payload.contentType,
          },
        })),
      );
    }

    await db
      .update(documents)
      .set({ status: "ready", updatedAt: new Date() })
      .where(eq(documents.id, payload.documentId));
  } catch (error) {
    await db
      .update(documents)
      .set({ status: "failed", error: errorToMessage(error), updatedAt: new Date() })
      .where(eq(documents.id, payload.documentId));
    throw error;
  }
}

async function processAutomation(payload: AutomationJob) {
  await db
    .update(automationRuns)
    .set({ status: "running" })
    .where(eq(automationRuns.id, payload.runId));

  try {
    const [embedding] = await embedTexts([payload.question], "query");
    const chunks = embedding ? await findRelevantChunks(payload.workspaceId, embedding, 6) : [];
    const summary = await draftAutomationBrief(payload.question, buildCitationBlock(chunks));

    await db
      .update(automationRuns)
      .set({ status: "completed", summary, completedAt: new Date() })
      .where(eq(automationRuns.id, payload.runId));
  } catch (error) {
    await db
      .update(automationRuns)
      .set({ status: "failed", error: errorToMessage(error), completedAt: new Date() })
      .where(eq(automationRuns.id, payload.runId));
    throw error;
  }
}

async function processWorkflowAutomation(payload: WorkflowAutomationJob) {
  await db
    .update(automationRuns)
    .set({ status: "running" })
    .where(eq(automationRuns.id, payload.runId));

  try {
    const voyageIds = payload.voyageId ? [payload.voyageId] : await activeVoyageIds(payload.workspaceId);
    let inserted = 0;
    let available = 0;

    for (const voyageId of voyageIds) {
      const context = await loadWorkflowContext(payload.workspaceId, voyageId);
      for (const workflow of workflowsForRun(payload.workflow)) {
        const intelligence = await generateAiWorkflowIntelligence(payload.workspaceId, context, workflow);
        await persistReconciliationFindings(payload.workspaceId, intelligence.findings);
        const result = await persistWorkflowJobs(payload.workspaceId, voyageId, intelligence.jobs);
        inserted += result.inserted;
      }
      available += await availableWorkflowJobs(payload.workspaceId, voyageId);
    }

    await db
      .update(automationRuns)
      .set({
        status: "completed",
        summary: [
          `Workflow automation: ${payload.workflow}`,
          `Voyages checked: ${voyageIds.length}`,
          `New tasks created: ${inserted}`,
          `Open workflow tasks available: ${available}`,
        ].join("\n"),
        completedAt: new Date(),
      })
      .where(eq(automationRuns.id, payload.runId));
  } catch (error) {
    await db
      .update(automationRuns)
      .set({ status: "failed", error: errorToMessage(error), completedAt: new Date() })
      .where(eq(automationRuns.id, payload.runId));
    throw error;
  }
}

async function processIntelligenceJob(payload: import("@syntheci/shared").IntelligenceQueueJob) {
  const voyageIds = payload.voyageId ? [payload.voyageId] : await activeVoyageIds(payload.workspaceId);
  for (const voyageId of voyageIds) {
    const context = await loadWorkflowContext(payload.workspaceId, voyageId);
    if (payload.kind === "document-extraction") {
      await persistDocumentExtractions(payload.workspaceId, extractDocumentFields(context));
    }
    if (payload.kind === "voyage-reconciliation") {
      const intelligence = await generateAiWorkflowIntelligence(payload.workspaceId, context, "reconciliation");
      await persistReconciliationFindings(payload.workspaceId, intelligence.findings);
      await persistWorkflowJobs(payload.workspaceId, voyageId, intelligence.jobs);
    }
    if (payload.kind === "voyage-change-monitor") {
      const intelligence = await generateAiWorkflowIntelligence(payload.workspaceId, context, "change-monitor");
      await persistReconciliationFindings(payload.workspaceId, intelligence.findings);
      await persistWorkflowJobs(payload.workspaceId, voyageId, intelligence.jobs);
    }
    if (payload.kind === "audit-check") {
      const intelligence = await generateAiWorkflowIntelligence(payload.workspaceId, context, "audit");
      await persistReconciliationFindings(payload.workspaceId, intelligence.findings);
      await persistWorkflowJobs(payload.workspaceId, voyageId, intelligence.jobs);
    }
  }
}

async function activeVoyageIds(workspaceId: string) {
  const rows = await db
    .select({ id: maritimeVoyages.id })
    .from(maritimeVoyages)
    .where(eq(maritimeVoyages.workspaceId, workspaceId));

  return rows.map((row) => row.id);
}

async function loadWorkflowContext(workspaceId: string, voyageId: string): Promise<WorkflowContext> {
  const [voyage] = await db
    .select()
    .from(maritimeVoyages)
    .where(and(eq(maritimeVoyages.workspaceId, workspaceId), eq(maritimeVoyages.id, voyageId)))
    .limit(1);

  if (!voyage) throw new Error(`Voyage not found: ${voyageId}`);

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

async function generateAiWorkflowIntelligence(workspaceId: string, context: WorkflowContext, workflow: string) {
  const query = buildVoyageRetrievalQuery(context, workflow);
  const [embedding] = await embedTexts([query], "query");
  const retrievedChunks = embedding ? await findRelevantChunks(workspaceId, embedding, 10, query) : [];
  return generateVoyageIntelligence({ context, retrievedChunks, workflow });
}

async function persistWorkflowJobs(workspaceId: string, voyageId: string, drafts: WorkflowJobDraft[]) {
  const existing = await db
    .select()
    .from(operationalJobs)
    .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId), ne(operationalJobs.status, "dismissed")));

  const existingKeys = new Set(existing.map((job) => workflowJobKey(job.jobType, job.title)));
  const insertable = drafts.filter((draft) => !existingKeys.has(workflowJobKey(draft.jobType, draft.title)));

  if (insertable.length > 0) {
    const now = new Date();
    await db.insert(operationalJobs).values(
      insertable.map((draft) => ({
        id: crypto.randomUUID(),
        workspaceId,
        voyageId,
        jobType: draft.jobType,
        status: "open" as const,
        priority: draft.priority,
        title: draft.title,
        summary: draft.summary,
        evidence: draft.evidence,
        payload: draft.payload,
        createdAt: now,
        updatedAt: now,
      })),
    );
  }

  return { inserted: insertable.length, available: existing.length + insertable.length };
}

async function availableWorkflowJobs(workspaceId: string, voyageId: string) {
  const rows = await db
    .select({ id: operationalJobs.id })
    .from(operationalJobs)
    .where(and(eq(operationalJobs.workspaceId, workspaceId), eq(operationalJobs.voyageId, voyageId), ne(operationalJobs.status, "dismissed")));
  return rows.length;
}

function workflowJobKey(jobType: string, title: string) {
  return `${jobType}:${title.toLowerCase()}`;
}

function workflowsForRun(workflow: string) {
  if (workflow !== "all") return [workflow];
  return runnableWorkflowIds;
}

const runnableWorkflowIds = [
  "missing-documents",
  "pda-fda",
  "reconciliation",
  "change-monitor",
  "audit",
  "action-plan",
  "claims-pack",
  "payment-risk",
];

function buildVoyageRetrievalQuery(context: WorkflowContext, workflow: string) {
  return [
    context.voyage.id,
    context.voyage.vesselName,
    context.voyage.originPort,
    context.voyage.destinationPort,
    context.voyage.cargo,
    workflow,
    workflowRetrievalTerms(workflow),
    "operational risk evidence missing documents payment claims compliance AIS bunker voyage changes",
  ]
    .filter(Boolean)
    .join(" ");
}

function workflowRetrievalTerms(workflow: string) {
  const terms: Record<string, string> = {
    all: "risk findings tasks contradictions evidence",
    "missing-documents": "missing document attachment pending unavailable stale required certificate source evidence",
    watchlist: "watchlist blocker urgent risk latest update monitor active voyage",
    "pda-fda": "PDA FDA disbursement account proforma final port costs remittance dues",
    "claims-pack": "claim demurrage laytime statement of facts SOF notice of readiness NOR delay cargo invoice",
    "payment-risk": "payment invoice remittance beneficiary approval hold bank FDA amount compliance",
    reconciliation: "reconcile mismatch contradiction discrepancy inconsistent compare documents email AIS bunker finance",
    "change-monitor": "change updated revised latest previous ETA destination status cargo instruction",
    audit: "audit source traceability unsupported missing evidence confidence control verify",
    "action-plan": "action plan next step operator assign resolve urgent high confidence",
  };
  return terms[workflow] ?? terms.all;
}

async function objectBodyToBytes(body: unknown) {
  if (!body) return new Uint8Array();
  if (typeof body === "object" && "transformToByteArray" in body) {
    return (body as { transformToByteArray: () => Promise<Uint8Array> }).transformToByteArray();
  }
  throw new Error("Unsupported S3 response body");
}

function errorToMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown worker error";
}

function redisConnectionOptions(redisUrl: string) {
  const url = new URL(redisUrl);
  return {
    host: url.hostname,
    port: Number(url.port || 6379),
    password: url.password || undefined,
    maxRetriesPerRequest: null,
  };
}

console.log("Syntheci worker listening", {
  ingestion: ingestionWorker.name,
  automation: automationWorker.name,
});
