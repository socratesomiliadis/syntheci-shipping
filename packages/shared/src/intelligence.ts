import type { OperationalJobPriority } from "./maritime";
import type { WorkflowContext, WorkflowEvidence, WorkflowJobDraft } from "./workflows";

export type ExtractionStatus = "extracted" | "partial" | "needs_review";
export type FindingSeverity = "low" | "medium" | "high";
export type SourceConfidenceLevel = "primary" | "structured" | "thread" | "inferred" | "weak";
export type IntelligenceWorkflow =
  | "missing-documents"
  | "watchlist"
  | "pda-fda"
  | "claims-pack"
  | "payment-risk"
  | "reconciliation"
  | "change-monitor"
  | "audit"
  | "action-plan"
  | "all";

export type ExtractedField = {
  name: string;
  value: string;
  confidence: number;
  excerpt: string;
};

export type DocumentExtractionDraft = {
  documentId: string;
  voyageId: string;
  vesselName: string;
  documentType: string;
  fields: ExtractedField[];
  confidence: number;
  status: ExtractionStatus;
  evidence: WorkflowEvidence[];
};

export type ReconciliationFindingDraft = {
  findingType: string;
  voyageId: string;
  severity: FindingSeverity;
  confidence: number;
  title: string;
  summary: string;
  evidence: WorkflowEvidence[];
  suggestedAction: string;
  payload: Record<string, unknown>;
};

export type SourceConfidence = {
  level: SourceConfidenceLevel;
  score: number;
  label: string;
  rationale: string;
};

export type AuditCheck = {
  key: string;
  severity: FindingSeverity;
  passed: boolean;
  title: string;
  summary: string;
  evidence: WorkflowEvidence[];
};

export type VoyageSnapshotDraft = {
  voyageId: string;
  stateHash: string;
  state: Record<string, unknown>;
};

export type VoyageChangeDraft = {
  voyageId: string;
  stateHash: string;
  currentState: Record<string, unknown>;
  changes: ReconciliationFindingDraft[];
};

export type ParsedWorkflowIntent = {
  workflow: IntelligenceWorkflow;
  scope: "all-voyages" | "single-voyage";
  voyageId?: string;
  cadence: "manual" | "hourly" | "daily" | "weekly";
  conditionSummary: string;
  confidence: number;
};

export function extractDocumentFields(context: WorkflowContext): DocumentExtractionDraft[] {
  return context.documents.map((document) => {
    const documentType = normalizeDocumentType(document.documentType ?? document.fileName);
    const content = document.content ?? "";
    const fields = fieldsForDocument(documentType, content);
    const confidence = fields.length === 0 ? 0.35 : average(fields.map((field) => field.confidence));

    return {
      documentId: document.id,
      voyageId: context.voyage.id,
      vesselName: context.voyage.vesselName,
      documentType,
      fields,
      confidence: roundConfidence(confidence),
      status: fields.length === 0 ? "needs_review" : confidence >= 0.75 ? "extracted" : "partial",
      evidence: [documentEvidence(document.id, document.fileName, content, document.documentType)],
    };
  });
}

export function buildReconciliationFindings(context: WorkflowContext): ReconciliationFindingDraft[] {
  return [
    ...detectEtaMismatch(context),
    ...detectPdaFdaGap(context),
    ...detectBunkerMismatch(context),
    ...detectPaymentAllocationConflict(context),
    ...detectEmailAttachmentGaps(context),
  ];
}

export function buildAuditChecks(context: WorkflowContext, findings = buildReconciliationFindings(context)): AuditCheck[] {
  const missingPrimaryDocs = ["voyage_order", "charterparty_excerpt"].filter(
    (documentType) => !context.documents.some((document) => normalizeDocumentType(document.documentType ?? document.fileName) === documentType),
  );
  const highFindings = findings.filter((finding) => finding.severity === "high");
  const unsupportedDraft = context.documents.length === 0 && context.emails.length > 0;

  return [
    {
      key: "primary_docs",
      severity: missingPrimaryDocs.length > 0 ? "high" : "low",
      passed: missingPrimaryDocs.length === 0,
      title: "Primary voyage evidence",
      summary:
        missingPrimaryDocs.length === 0
          ? "Primary voyage and charterparty evidence is indexed."
          : `Missing primary evidence: ${missingPrimaryDocs.map(formatLabel).join(", ")}.`,
      evidence: contextEvidence(context, 3),
    },
    {
      key: "open_contradictions",
      severity: highFindings.length > 0 ? "high" : "low",
      passed: highFindings.length === 0,
      title: "Open contradictions",
      summary:
        highFindings.length === 0
          ? "No high-severity reconciliation contradictions were detected."
          : `${highFindings.length} high-severity contradiction${highFindings.length === 1 ? "" : "s"} should be resolved before external reliance.`,
      evidence: highFindings.flatMap((finding) => finding.evidence).slice(0, 4),
    },
    {
      key: "reply_support",
      severity: unsupportedDraft ? "medium" : "low",
      passed: !unsupportedDraft,
      title: "Reply support",
      summary: unsupportedDraft
        ? "Email signals exist without indexed supporting documents; outbound replies should stay provisional."
        : "The voyage has indexed source evidence available for cited reply drafting.",
      evidence: contextEvidence(context, 3),
    },
  ];
}

export function buildAiActionPlanJobs(context: WorkflowContext, findings = buildReconciliationFindings(context)): WorkflowJobDraft[] {
  const highConfidenceFindings = findings.filter((finding) => finding.confidence >= 0.75 && finding.severity !== "low");
  const jobs = highConfidenceFindings.map(findingToJob);

  if (context.complianceFlag && context.complianceFlag.riskScore >= 70) {
    jobs.push({
      jobType: "ai_action_plan",
      priority: "high",
      title: `AI action plan for ${context.voyage.id}`,
      summary: `Resolve compliance exposure before relying on ${context.voyage.id}: ${context.complianceFlag.rationale.slice(0, 2).join("; ")}.`,
      evidence: [complianceEvidence(context.complianceFlag.id, context.complianceFlag.riskLevel, context.complianceFlag.rationale)],
      payload: {
        confidence: 0.86,
        suggestedNextSteps: [
          "Confirm missing fuel or emissions evidence.",
          "Review charterparty allocation language.",
          "Keep external position provisional until contradictions are cleared.",
        ],
      },
    });
  }

  return dedupeJobs(jobs);
}

export function buildClaimsPackSummary(context: WorkflowContext) {
  const clauses = context.documents.filter((document) => /charterparty/i.test(document.documentType ?? document.fileName));
  const norSofDocs = context.documents.filter((document) => /notice_of_readiness|statement_of_facts|nor|sof/i.test(document.documentType ?? document.fileName));
  const delayEvents = context.events.filter((event) => /delay|weather|berth|stoppage|anchorage/i.test(`${event.eventType} ${event.description}`));
  const emails = context.emails.filter((email) => /claim|delay|demurrage|laytime|berth|weather|nor|sof/i.test(`${email.subject} ${email.body}`));

  return {
    title: `Claims evidence pack for ${context.voyage.id}`,
    summary: [
      `${clauses.length} charterparty source${clauses.length === 1 ? "" : "s"}`,
      `${norSofDocs.length} NOR/SOF source${norSofDocs.length === 1 ? "" : "s"}`,
      `${delayEvents.length} delay/weather event${delayEvents.length === 1 ? "" : "s"}`,
      `${emails.length} related email${emails.length === 1 ? "" : "s"}`,
    ].join("; "),
    evidence: [
      ...clauses.map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
      ...norSofDocs.map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
      ...delayEvents.map(eventEvidence),
      ...emails.map(emailEvidence),
    ].slice(0, 12),
  };
}

export function draftCitedReply(context: WorkflowContext, findings = buildReconciliationFindings(context)) {
  const topFindings = findings.filter((finding) => finding.severity !== "low").slice(0, 3);
  const missingDocs = ["voyage_order", "charterparty_excerpt", "statement_of_facts", "notice_of_readiness"].filter(
    (documentType) => !context.documents.some((document) => normalizeDocumentType(document.documentType ?? document.fileName) === documentType),
  );
  const citations = [...topFindings.flatMap((finding) => finding.evidence), ...contextEvidence(context, 4)].slice(0, 6);

  return {
    subject: `Re: ${context.voyage.vesselName} / ${context.voyage.id}`,
    body: [
      "Good day,",
      "",
      `For ${context.voyage.vesselName} / ${context.voyage.id}, our current position remains provisional pending linked evidence review.`,
      topFindings.length > 0
        ? `Current exception notes: ${topFindings.map((finding) => finding.summary).join(" ")}`
        : "No high-confidence contradictions are currently detected from indexed evidence.",
      missingDocs.length > 0 ? `Please provide or confirm: ${missingDocs.map(formatLabel).join(", ")}.` : "The main expected source documents are indexed.",
      "",
      "We will avoid closing the position until the supporting documents and any contradictions are reconciled against the voyage file.",
      "",
      "Regards,",
      "Operations Desk",
    ].join("\n"),
    evidence: citations,
    unsupportedWarnings: buildAuditChecks(context, findings)
      .filter((check) => !check.passed)
      .map((check) => check.summary),
  };
}

export function scoreSourceConfidence(sourceType: string, documentType?: string | null): SourceConfidence {
  const normalizedType = normalizeDocumentType(documentType ?? "");
  if (sourceType === "file" || sourceType === "document") {
    const primary = ["statement_of_facts", "notice_of_readiness", "charterparty_excerpt", "bunker_fuel_document", "invoice", "pda", "fda"];
    return primary.includes(normalizedType)
      ? { level: "primary", score: 0.92, label: "Primary document", rationale: "Operational document directly tied to the voyage." }
      : { level: "primary", score: 0.82, label: "Indexed document", rationale: "Document evidence is available but not a core primary type." };
  }
  if (sourceType === "structured_record" || sourceType.includes("compliance") || sourceType.includes("ais")) {
    return { level: "structured", score: 0.84, label: "Structured record", rationale: "Structured operational data tied to the voyage." };
  }
  if (sourceType === "email_thread" || sourceType === "email") {
    return { level: "thread", score: 0.68, label: "Email evidence", rationale: "Operational correspondence may need primary document support." };
  }
  return { level: "inferred", score: 0.48, label: "Inferred signal", rationale: "Signal inferred from context and should be verified." };
}

export function buildVoyageSnapshot(context: WorkflowContext, findings = buildReconciliationFindings(context)): VoyageSnapshotDraft {
  const latestAis = [...context.aisPositions].sort((left, right) => Date.parse(right.positionTimestamp) - Date.parse(left.positionTimestamp))[0];
  const latestEmail = [...context.emails].sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))[0];
  const state = {
    eta: context.voyage.eta,
    latestAisEta: latestAis?.eta ?? null,
    latestAisTimestamp: latestAis?.positionTimestamp ?? null,
    latestEmailId: latestEmail?.id ?? null,
    documentIds: context.documents.map((document) => document.id).sort(),
    riskScore: context.complianceFlag?.riskScore ?? null,
    riskLevel: context.complianceFlag?.riskLevel ?? null,
    findingKeys: findings.map((finding) => `${finding.findingType}:${finding.title}`).sort(),
    extractionHash: stableHash(extractDocumentFields(context).map((extraction) => ({
      documentId: extraction.documentId,
      fields: extraction.fields.map((field) => [field.name, field.value]),
    }))),
  };
  return { voyageId: context.voyage.id, stateHash: stableHash(state), state };
}

export function compareVoyageSnapshots(
  context: WorkflowContext,
  previous: { stateHash: string; state: Record<string, unknown> } | null | undefined,
): VoyageChangeDraft {
  const snapshot = buildVoyageSnapshot(context);
  if (!previous || previous.stateHash === snapshot.stateHash) {
    return { voyageId: context.voyage.id, stateHash: snapshot.stateHash, currentState: snapshot.state, changes: [] };
  }

  const changes: ReconciliationFindingDraft[] = [];
  if (previous.state.latestAisEta && previous.state.latestAisEta !== snapshot.state.latestAisEta) {
    changes.push(changeFinding(context, "ais_eta_changed", "AIS ETA changed", `AIS ETA changed from ${previous.state.latestAisEta} to ${snapshot.state.latestAisEta}.`));
  }
  if (previous.state.latestEmailId && previous.state.latestEmailId !== snapshot.state.latestEmailId) {
    changes.push(changeFinding(context, "new_email_signal", "New voyage email", `Latest indexed email changed from ${previous.state.latestEmailId} to ${snapshot.state.latestEmailId}.`));
  }
  if (previous.state.riskScore !== snapshot.state.riskScore || previous.state.riskLevel !== snapshot.state.riskLevel) {
    changes.push(changeFinding(context, "risk_changed", "Risk state changed", `Risk changed from ${previous.state.riskLevel ?? "unknown"} ${previous.state.riskScore ?? ""} to ${snapshot.state.riskLevel ?? "unknown"} ${snapshot.state.riskScore ?? ""}.`));
  }

  return { voyageId: context.voyage.id, stateHash: snapshot.stateHash, currentState: snapshot.state, changes };
}

export function parseWorkflowIntent(question: string): ParsedWorkflowIntent {
  const normalized = question.toLowerCase();
  const voyageId = question.match(/\bVOY-\d{4}-\d{4}\b/i)?.[0]?.toUpperCase();
  const cadence = normalized.includes("hour") ? "hourly" : normalized.includes("week") ? "weekly" : normalized.includes("day") || normalized.includes("morning") ? "daily" : "manual";
  const workflow: IntelligenceWorkflow =
    /reconcile|contradiction|conflict|mismatch/.test(normalized) ? "reconciliation" :
    /change|changed|monitor|watch.*eta|since/.test(normalized) ? "change-monitor" :
    /audit|support|unsupported|verify/.test(normalized) ? "audit" :
    /claim|demurrage|laytime|nor|sof/.test(normalized) ? "claims-pack" :
    /pda|fda|payment|invoice|finance|remittance/.test(normalized) ? "payment-risk" :
    /missing|gap|document|source/.test(normalized) ? "missing-documents" :
    /watch|risk|compliance|ets|fueleu|mrv|cii/.test(normalized) ? "watchlist" :
    /action|next step|handover/.test(normalized) ? "action-plan" :
    "watchlist";

  return {
    workflow,
    scope: voyageId ? "single-voyage" : "all-voyages",
    voyageId,
    cadence,
    conditionSummary: summarizeIntent(question, workflow),
    confidence: workflow === "watchlist" && !/watch|risk|compliance|ets|fueleu|mrv|cii/i.test(question) ? 0.55 : 0.82,
  };
}

function fieldsForDocument(documentType: string, content: string): ExtractedField[] {
  const text = stripFrontMatter(content);
  const common = [
    field("voyage_id", /\bVOY-\d{4}-\d{4}\b/i, text, 0.9),
    field("vessel_name", /\bAMS\s+[A-Z][A-Za-z\s]+\b/, text, 0.78),
  ].filter(Boolean) as ExtractedField[];

  if (documentType === "notice_of_readiness") return [...common, ...fields(text, [
    ["nor_time", /(?:nor|notice of readiness)[^\n.]*?(?:at|time)[:\s-]+([0-9T:Z+\-. ]{8,})/i, 0.72],
    ["tender_location", /(?:tendered|nor)[^\n.]*?(?:at|from)\s+([A-Za-z][A-Za-z\s-]{3,40})/i, 0.68],
  ])];
  if (documentType === "statement_of_facts") return [...common, ...fields(text, [
    ["arrival_time", /arriv(?:ed|al)[^\n.]*?([0-9]{4}-[0-9]{2}-[0-9]{2}[T\s][0-9:Z+\-.]*)/i, 0.76],
    ["all_fast_time", /all fast[^\n.]*?([0-9]{4}-[0-9]{2}-[0-9]{2}[T\s][0-9:Z+\-.]*)/i, 0.78],
    ["stoppage", /(rain|weather|berth|cargo|stoppage)[^\n.]*[.]/i, 0.66],
  ])];
  if (documentType === "bunker_fuel_document") return [...common, ...fields(text, [
    ["fuel_type", /\b(VLSFO|MGO|LNG|HSFO|ULSFO)\b/i, 0.86],
    ["quantity_mt", /([0-9]+(?:\.[0-9]+)?)\s*(?:mt|metric tons?|tonnes?)/i, 0.78],
    ["sulfur_pct", /sulph?ur[^\n.]*?([0-9]+(?:\.[0-9]+)?)\s*%/i, 0.78],
    ["supplier", /supplier[:\s-]+([A-Za-z][A-Za-z0-9 &.-]{3,60})/i, 0.68],
  ])];
  if (documentType === "pda" || documentType === "fda" || documentType === "invoice") return [...common, ...fields(text, [
    ["amount", /(?:total|amount|invoice)[^\n.]*?([A-Z]{3}\s*)?([0-9][0-9,]+(?:\.[0-9]{2})?)/i, 0.72],
    ["port_dues", /port dues[^\n.]*?([0-9][0-9,]+(?:\.[0-9]{2})?)/i, 0.7],
    ["status", /\b(pending|approved|disputed|hold|final|proforma)\b/i, 0.66],
  ])];
  if (documentType === "charterparty_excerpt") return [...common, ...fields(text, [
    ["laycan", /laycan[:\s-]+([^\n.]+[.]?)/i, 0.82],
    ["demurrage", /(demurrage|laytime)[^\n.]*[.]?/i, 0.76],
    ["ets_fueleu_allocation", /(eu ets|fueleu|emissions)[^\n.]*[.]?/i, 0.76],
    ["exceptions", /(exception|reservation|weather|reversible time)[^\n.]*[.]?/i, 0.68],
  ])];
  if (documentType === "port_weather_notice") return [...common, ...fields(text, [
    ["weather", /(weather|wind|swell|rain)[^\n.]*[.]?/i, 0.72],
    ["berth_status", /(berth|pilot|draft|congestion)[^\n.]*[.]?/i, 0.72],
  ])];
  if (/claim|compliance|mrv|supplier_declaration/.test(documentType)) return [...common, ...fields(text, [
    ["issue", /(claim|mrv|ets|fueleu|cii|supplier|declaration)[^\n.]*[.]?/i, 0.68],
    ["status", /\b(pending|approved|disputed|missing|corrected|provisional)\b/i, 0.64],
  ])];
  return common;
}

function detectEtaMismatch(context: WorkflowContext): ReconciliationFindingDraft[] {
  const latestAis = [...context.aisPositions].sort((left, right) => Date.parse(right.positionTimestamp) - Date.parse(left.positionTimestamp))[0];
  if (!latestAis || !context.voyage.eta) return [];
  const hours = Math.abs(Date.parse(latestAis.eta) - Date.parse(context.voyage.eta)) / (1000 * 60 * 60);
  if (!Number.isFinite(hours) || hours < 6) return [];
  return [{
    findingType: "eta_mismatch",
    voyageId: context.voyage.id,
    severity: hours >= 24 ? "high" : "medium",
    confidence: 0.82,
    title: `ETA mismatch on ${context.voyage.id}`,
    summary: `Voyage ETA ${context.voyage.eta} differs from latest AIS ETA ${latestAis.eta} by about ${Math.round(hours)} hours.`,
    evidence: [aisEvidence(latestAis.id, latestAis.destination, latestAis.eta, latestAis.speedKnots)],
    suggestedAction: "Confirm latest ETA with vessel/agent and update voyage order if needed.",
    payload: { voyageEta: context.voyage.eta, aisEta: latestAis.eta, hoursDifference: Math.round(hours) },
  }];
}

function detectPdaFdaGap(context: WorkflowContext): ReconciliationFindingDraft[] {
  const pdaDocs = context.documents.filter((document) => normalizeDocumentType(document.documentType ?? document.fileName) === "pda");
  const fdaDocs = context.documents.filter((document) => normalizeDocumentType(document.documentType ?? document.fileName) === "fda");
  const paymentSignal = /pda|fda|payment|finance review|funding|port dues|disbursement/i.test(
    [...context.emails.map((email) => `${email.subject} ${email.body}`), ...context.documents.map((document) => `${document.fileName} ${document.content ?? ""}`)].join(" "),
  );
  if (!paymentSignal || pdaDocs.length === fdaDocs.length) return [];
  return [{
    findingType: "pda_fda_gap",
    voyageId: context.voyage.id,
    severity: fdaDocs.length === 0 ? "high" : "medium",
    confidence: 0.84,
    title: `PDA/FDA evidence gap for ${context.voyage.id}`,
    summary: pdaDocs.length > 0 && fdaDocs.length === 0
      ? "PDA evidence is indexed but final disbursement evidence is missing."
      : "FDA evidence is indexed without matching PDA support.",
    evidence: [...pdaDocs, ...fdaDocs].map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
    suggestedAction: "Request the missing disbursement side before approving payment or closing port costs.",
    payload: { pdaDocumentIds: pdaDocs.map((document) => document.id), fdaDocumentIds: fdaDocs.map((document) => document.id) },
  }];
}

function detectBunkerMismatch(context: WorkflowContext): ReconciliationFindingDraft[] {
  const reports = context.bunkerReports ?? [];
  if (reports.length === 0) return [];
  const bunkerDocs = context.documents.filter((document) => normalizeDocumentType(document.documentType ?? document.fileName) === "bunker_fuel_document");
  const docsText = bunkerDocs.map((document) => document.content ?? "").join("\n");
  const findings: ReconciliationFindingDraft[] = [];
  for (const report of reports) {
    const quantityPattern = new RegExp(`${Math.round(report.quantityMt)}(?:\\.0+)?\\s*(?:mt|metric tons?|tonnes?)`, "i");
    const fuelPattern = new RegExp(`\\b${escapeRegExp(report.fuelType)}\\b`, "i");
    if (bunkerDocs.length > 0 && (!quantityPattern.test(docsText) || !fuelPattern.test(docsText))) {
      findings.push({
        findingType: "bunker_mismatch",
        voyageId: context.voyage.id,
        severity: "medium",
        confidence: 0.78,
        title: `Bunker evidence mismatch for ${context.voyage.id}`,
        summary: `Structured bunker report ${report.id} (${report.fuelType}, ${report.quantityMt} mt) is not clearly matched in indexed bunker documents.`,
        evidence: [
          structuredEvidence("bunker_report", report.id, `${report.fuelType} ${report.quantityMt} mt at ${report.port}`),
          ...bunkerDocs.slice(0, 3).map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
        ],
        suggestedAction: "Reconcile bunker invoice/BDN figures before MRV, FuelEU, or payment reliance.",
        payload: { bunkerReportId: report.id, fuelType: report.fuelType, quantityMt: report.quantityMt },
      });
    }
  }
  return findings;
}

function detectPaymentAllocationConflict(context: WorkflowContext): ReconciliationFindingDraft[] {
  const charterText = context.documents
    .filter((document) => normalizeDocumentType(document.documentType ?? document.fileName) === "charterparty_excerpt")
    .map((document) => document.content ?? "")
    .join(" ");
  const paymentText = context.documents
    .filter((document) => /invoice|pda|fda|payment/i.test(document.documentType ?? document.fileName))
    .map((document) => document.content ?? "")
    .join(" ");
  if (!/(ets|fueleu|emissions)/i.test(charterText) || !/(ets|fueleu|emissions)/i.test(paymentText)) return [];
  const chartererPays = /charterer/i.test(charterText) && /(owner|operator)/i.test(paymentText);
  const ownerPays = /(owner|operator)/i.test(charterText) && /charterer/i.test(paymentText);
  if (!chartererPays && !ownerPays) return [];
  return [{
    findingType: "payment_allocation_conflict",
    voyageId: context.voyage.id,
    severity: "medium",
    confidence: 0.72,
    title: `Emissions cost allocation conflict for ${context.voyage.id}`,
    summary: "Charterparty and payment/invoice language appear to allocate emissions-related costs to different parties.",
    evidence: context.documents
      .filter((document) => /charterparty|invoice|pda|fda|payment/i.test(document.documentType ?? document.fileName))
      .slice(0, 4)
      .map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
    suggestedAction: "Review charterparty allocation language before approving or disputing emissions-related charges.",
    payload: { chartererPays, ownerPays },
  }];
}

function detectEmailAttachmentGaps(context: WorkflowContext): ReconciliationFindingDraft[] {
  const indexedDocumentIds = new Set(context.documents.map((document) => document.id));
  const missing = context.emails.flatMap((email) =>
    (email.attachments ?? [])
      .filter((attachment) => attachment.document_id && !indexedDocumentIds.has(attachment.document_id))
      .map((attachment) => ({ email, attachment })),
  );
  if (missing.length === 0) return [];
  return [{
    findingType: "email_attachment_gap",
    voyageId: context.voyage.id,
    severity: "medium",
    confidence: 0.8,
    title: `Referenced attachments not indexed for ${context.voyage.id}`,
    summary: `${missing.length} email attachment reference${missing.length === 1 ? "" : "s"} are not present in indexed voyage documents.`,
    evidence: missing.slice(0, 4).map(({ email }) => emailEvidence(email)),
    suggestedAction: "Request or reingest missing referenced attachments before relying on the thread.",
    payload: { attachmentIds: missing.map(({ attachment }) => attachment.document_id ?? attachment.attachment_id).filter(Boolean) },
  }];
}

function findingToJob(finding: ReconciliationFindingDraft): WorkflowJobDraft {
  return {
    jobType: finding.findingType === "voyage_change" ? "voyage_change" : "reconciliation_conflict",
    priority: finding.severity as OperationalJobPriority,
    title: finding.title,
    summary: finding.summary,
    evidence: finding.evidence,
    payload: {
      findingType: finding.findingType,
      confidence: finding.confidence,
      suggestedAction: finding.suggestedAction,
      ...finding.payload,
    },
  };
}

function changeFinding(context: WorkflowContext, findingType: string, title: string, summary: string): ReconciliationFindingDraft {
  return {
    findingType: "voyage_change",
    voyageId: context.voyage.id,
    severity: "medium",
    confidence: 0.84,
    title: `${title} for ${context.voyage.id}`,
    summary,
    evidence: contextEvidence(context, 4),
    suggestedAction: "Review the changed state and update the voyage file if operationally material.",
    payload: { changeType: findingType },
  };
}

function field(name: string, pattern: RegExp, text: string, confidence: number): ExtractedField | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;
  const value = (match[1] ?? match[0]).trim().replace(/\s+/g, " ");
  return { name, value, confidence, excerpt: excerptAround(text, match.index ?? 0) };
}

function fields(text: string, rules: [string, RegExp, number][]) {
  return rules.map(([name, pattern, confidence]) => field(name, pattern, text, confidence)).filter(Boolean) as ExtractedField[];
}

function normalizeDocumentType(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized.includes("charterparty")) return "charterparty_excerpt";
  if (normalized.includes("voyage_order")) return "voyage_order";
  if (normalized.includes("bunker") || normalized.includes("bdn") || normalized.includes("fuel")) return "bunker_fuel_document";
  if (normalized.includes("notice_of_readiness") || normalized.includes("nor")) return "notice_of_readiness";
  if (normalized.includes("statement_of_facts") || normalized.includes("sof")) return "statement_of_facts";
  if (normalized.includes("weather") || normalized.includes("port_notice")) return "port_weather_notice";
  if (normalized.includes("invoice")) return "invoice";
  if (normalized.includes("pda")) return "pda";
  if (normalized.includes("fda")) return "fda";
  return normalized;
}

function contextEvidence(context: WorkflowContext, limit: number) {
  return [
    ...context.documents.map((document) => documentEvidence(document.id, document.fileName, document.content ?? "", document.documentType)),
    ...context.emails.map(emailEvidence),
    ...(context.complianceFlag ? [complianceEvidence(context.complianceFlag.id, context.complianceFlag.riskLevel, context.complianceFlag.rationale)] : []),
  ].slice(0, limit);
}

function documentEvidence(sourceId: string, label: string, content: string, documentType?: string | null): WorkflowEvidence {
  return {
    sourceType: "file",
    sourceId,
    label,
    href: `/workspace/sources?type=file&id=${sourceId}`,
    excerpt: firstSentence(stripFrontMatter(content)) || formatLabel(documentType ?? "document"),
  };
}

function emailEvidence(email: { id: string; subject: string; body: string }): WorkflowEvidence {
  return {
    sourceType: "email",
    sourceId: email.id,
    label: email.subject,
    href: `/workspace/sources?type=email&id=${email.id}`,
    excerpt: firstSentence(email.body),
  };
}

function eventEvidence(event: { id: string; eventType: string; description: string }): WorkflowEvidence {
  return { sourceType: "voyage_event", sourceId: event.id, label: formatLabel(event.eventType), excerpt: event.description };
}

function aisEvidence(sourceId: string, destination: string, eta: string, speedKnots: number): WorkflowEvidence {
  return { sourceType: "structured_record", sourceId, label: `AIS update to ${destination}`, excerpt: `ETA ${eta}; speed ${speedKnots} knots.` };
}

function structuredEvidence(recordType: string, sourceId: string, excerpt: string): WorkflowEvidence {
  return { sourceType: "structured_record", sourceId, label: formatLabel(recordType), excerpt };
}

function complianceEvidence(sourceId: string, riskLevel: string, rationale: string[]): WorkflowEvidence {
  return { sourceType: "compliance_flag", sourceId, label: `${formatLabel(riskLevel)} risk`, excerpt: rationale.join("; ") };
}

function stripFrontMatter(value: string) {
  return value.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

function excerptAround(text: string, index: number) {
  return text.slice(Math.max(0, index - 80), index + 180).replace(/\s+/g, " ").trim();
}

function firstSentence(value: string) {
  return value.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || "";
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function roundConfidence(value: number) {
  return Math.max(0, Math.min(1, Number(value.toFixed(2))));
}

function stableHash(value: unknown) {
  const text = JSON.stringify(value, Object.keys(flattenForHash(value)).sort());
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function flattenForHash(value: unknown, output: Record<string, unknown> = {}) {
  if (!value || typeof value !== "object") return output;
  for (const [key, entry] of Object.entries(value)) {
    output[key] = entry;
    flattenForHash(entry, output);
  }
  return output;
}

function summarizeIntent(question: string, workflow: IntelligenceWorkflow) {
  return `${formatLabel(workflow)} workflow parsed from: ${question.slice(0, 180)}`;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dedupeJobs(jobs: WorkflowJobDraft[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.jobType}:${job.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
