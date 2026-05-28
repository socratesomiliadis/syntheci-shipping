import { generateText } from "ai";
import {
  aiVoyageIntelligenceOutputSchema,
  getServerEnv,
  type RankedRetrievalChunk,
  type ReconciliationFindingDraft,
  type VoyageRiskAssessmentDraft,
  type WorkflowContext,
  type WorkflowEvidence,
  type WorkflowJobDraft,
} from "@syntheci/shared";
import { chatModel, chatModelConfigurationHint, isChatModelConfigured } from "./models";

export type VoyageEvidenceSource = WorkflowEvidence & {
  refId: string;
  content?: string;
};

export type VoyageEvidenceRegistry = {
  sources: VoyageEvidenceSource[];
  aliases: Map<string, string>;
};

export type ValidatedVoyageIntelligence = {
  runSummary: string;
  riskAssessment: VoyageRiskAssessmentDraft | null;
  jobs: WorkflowJobDraft[];
  findings: ReconciliationFindingDraft[];
  dropped: {
    jobs: number;
    findings: number;
    riskAssessments: number;
  };
};

export class AiIntelligenceConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiIntelligenceConfigurationError";
  }
}

export async function generateVoyageIntelligence({
  context,
  retrievedChunks,
  workflow,
}: {
  context: WorkflowContext;
  retrievedChunks: RankedRetrievalChunk[];
  workflow: string;
}): Promise<ValidatedVoyageIntelligence> {
  const env = getServerEnv();
  if (!isChatModelConfigured(env)) {
    throw new AiIntelligenceConfigurationError(
      `AI intelligence is not configured. ${chatModelConfigurationHint(env)} to generate voyage intelligence.`,
    );
  }

  const registry = buildVoyageEvidenceRegistry(context, retrievedChunks);
  const { text } = await generateText({
    model: chatModel(),
    system: voyageIntelligenceSystemPrompt,
    prompt: buildVoyageIntelligencePrompt(context, workflow, registry),
  });
  const object = parseJsonObject(text);

  return validateVoyageIntelligenceOutput(object, registry, {
    model: env.AI_CHAT_MODEL,
    voyageId: context.voyage.id,
    workflow,
  });
}

export function buildVoyageEvidenceRegistry(
  context: WorkflowContext,
  retrievedChunks: RankedRetrievalChunk[] = [],
): VoyageEvidenceRegistry {
  const sources: VoyageEvidenceSource[] = [];
  const aliases = new Map<string, string>();

  const add = (source: VoyageEvidenceSource, extraAliases: string[] = []) => {
    sources.push(source);
    aliases.set(source.refId, source.refId);
    aliases.set(source.sourceId, source.refId);
    aliases.set(`${source.sourceType}:${source.sourceId}`, source.refId);
    for (const alias of extraAliases) {
      aliases.set(alias, source.refId);
    }
  };

  for (const document of context.documents) {
    add(
      {
        refId: `file:${document.id}`,
        sourceType: "file",
        sourceId: document.id,
        label: document.fileName,
        href: `/workspace/sources?type=file&id=${document.id}`,
        excerpt: firstSentence(document.content ?? document.documentType ?? "Document"),
        content: limitText(stripFrontMatter(document.content ?? ""), 900),
      },
      [document.fileName],
    );
  }

  for (const email of context.emails) {
    add({
      refId: `email:${email.id}`,
      sourceType: "email",
      sourceId: email.id,
      label: email.subject,
      href: `/workspace/sources?type=email&id=${email.id}`,
      excerpt: firstSentence(email.body),
      content: limitText(email.body, 900),
    });
  }

  for (const event of context.events) {
    add({
      refId: `voyage_event:${event.id}`,
      sourceType: "voyage_event",
      sourceId: event.id,
      label: formatLabel(event.eventType),
      excerpt: event.description,
      content: `${event.eventTime} ${event.location ?? ""} ${event.description}`.trim(),
    });
  }

  for (const position of context.aisPositions) {
    add({
      refId: `ais_position:${position.id}`,
      sourceType: "structured_record",
      sourceId: position.id,
      label: `AIS ${position.destination}`,
      excerpt: `ETA ${position.eta}; speed ${position.speedKnots} knots.`,
      content: `AIS position ${position.id}: timestamp ${position.positionTimestamp}; destination ${position.destination}; ETA ${position.eta}; speed ${position.speedKnots} knots.`,
    });
  }

  for (const report of context.bunkerReports ?? []) {
    add({
      refId: `bunker_report:${report.id}`,
      sourceType: "structured_record",
      sourceId: report.id,
      label: `Bunker ${report.id}`,
      excerpt: `${report.fuelType} ${report.quantityMt} mt at ${report.port}.`,
      content: `Bunker report ${report.id}: ${report.fuelType}, ${report.quantityMt} mt, sulphur ${report.sulfurPct}%, supplier ${report.supplier}, port ${report.port}, invoice date ${report.invoiceDate}.`,
    });
  }

  if (context.complianceFlag) {
    add({
      refId: `compliance_flag:${context.complianceFlag.id}`,
      sourceType: "compliance_flag",
      sourceId: context.complianceFlag.id,
      label: "Legacy compliance record",
      excerpt: context.complianceFlag.rationale.join("; "),
      content: `Legacy compliance record ${context.complianceFlag.id}: ${context.complianceFlag.rationale.join("; ")}`,
    });
  }

  for (const chunk of retrievedChunks) {
    const sourceType = chunk.sourceType ?? "document";
    const sourceId = chunk.sourceId ?? chunk.documentId ?? chunk.id;
    const refId = `retrieval:${chunk.id}`;
    add(
      {
        refId,
        sourceType,
        sourceId,
        label: `[${chunk.rank}] ${chunk.fileName}`,
        href: chunk.sourceHref,
        excerpt: firstSentence(chunk.content),
        content: limitText(chunk.content, 900),
      },
      [`[${chunk.rank}]`, chunk.fileName],
    );
  }

  return { sources, aliases };
}

export function validateVoyageIntelligenceOutput(
  value: unknown,
  registry: VoyageEvidenceRegistry,
  metadata: { model: string; voyageId: string; workflow: string },
): ValidatedVoyageIntelligence {
  const parsed = aiVoyageIntelligenceOutputSchema.safeParse(value);
  if (!parsed.success) {
    return {
      runSummary: "AI output did not match the voyage intelligence schema.",
      riskAssessment: null,
      jobs: [],
      findings: [],
      dropped: { jobs: 0, findings: 0, riskAssessments: 0 },
    };
  }

  const evidenceByRef = new Map(registry.sources.map((source) => [source.refId, source]));
  let droppedJobs = 0;
  let droppedFindings = 0;
  let droppedRiskAssessments = 0;

  const riskAssessmentEvidence = parsed.data.riskAssessment
    ? resolveEvidenceRefs(parsed.data.riskAssessment.evidenceRefs, registry, evidenceByRef)
    : [];
  const riskAssessment: VoyageRiskAssessmentDraft | null = parsed.data.riskAssessment && riskAssessmentEvidence.length > 0
    ? {
        voyageId: metadata.voyageId,
        riskScore: parsed.data.riskAssessment.riskScore,
        riskLevel: parsed.data.riskAssessment.riskLevel,
        summary: parsed.data.riskAssessment.summary,
        rationale: parsed.data.riskAssessment.rationale,
        confidence: parsed.data.riskAssessment.confidence,
        evidence: riskAssessmentEvidence,
        payload: {
          ...parsed.data.riskAssessment.payload,
          generatedBy: "ai",
          model: metadata.model,
          workflow: metadata.workflow,
          evidenceRefs: riskAssessmentEvidence.map((item) => `${item.sourceType}:${item.sourceId}`),
        },
      }
    : null;

  if (parsed.data.riskAssessment && riskAssessmentEvidence.length === 0) {
    droppedRiskAssessments += 1;
  }

  const jobs: WorkflowJobDraft[] = parsed.data.jobs.flatMap((job) => {
    const evidence = resolveEvidenceRefs(job.evidenceRefs, registry, evidenceByRef);
    if (evidence.length === 0) {
      droppedJobs += 1;
      return [];
    }

    return [{
      jobType: normalizeJobType(job.jobType),
      priority: job.priority,
      title: job.title,
      summary: job.summary,
      evidence,
      payload: {
        ...job.payload,
        generatedBy: "ai",
        model: metadata.model,
        workflow: metadata.workflow,
        confidence: job.confidence,
        runSummary: parsed.data.runSummary,
        evidenceRefs: evidence.map((item) => `${item.sourceType}:${item.sourceId}`),
        suggestedAction: job.suggestedAction,
      },
    }];
  });

  const findings: ReconciliationFindingDraft[] = parsed.data.findings.flatMap((finding) => {
    const evidence = resolveEvidenceRefs(finding.evidenceRefs, registry, evidenceByRef);
    if (evidence.length === 0) {
      droppedFindings += 1;
      return [];
    }

    return [{
      ...finding,
      voyageId: metadata.voyageId,
      evidence,
      payload: {
        ...finding.payload,
        generatedBy: "ai",
        model: metadata.model,
        workflow: metadata.workflow,
        evidenceRefs: evidence.map((item) => `${item.sourceType}:${item.sourceId}`),
      },
    }];
  });
  if (riskAssessment) {
    findings.unshift({
      findingType: "risk_assessment",
      voyageId: metadata.voyageId,
      severity: riskAssessment.riskLevel,
      confidence: riskAssessment.confidence,
      title: "AI voyage risk score",
      summary: riskAssessment.summary,
      evidence: riskAssessment.evidence,
      suggestedAction: riskAssessment.riskLevel === "high"
        ? "Review high-risk voyage evidence and assign the generated action jobs."
        : "Review the cited risk rationale and monitor for material changes.",
      payload: {
        ...riskAssessment.payload,
        riskScore: riskAssessment.riskScore,
        riskLevel: riskAssessment.riskLevel,
        rationale: riskAssessment.rationale,
      },
    });
  }

  return {
    runSummary: parsed.data.runSummary,
    riskAssessment,
    jobs: dedupeJobs(jobs),
    findings: dedupeFindings(findings),
    dropped: { jobs: droppedJobs, findings: droppedFindings, riskAssessments: droppedRiskAssessments },
  };
}

function buildVoyageIntelligencePrompt(context: WorkflowContext, workflow: string, registry: VoyageEvidenceRegistry) {
  const packet = {
    workflow,
    workflowFocus: workflowFocus(workflow),
    voyage: context.voyage,
    evidenceSources: registry.sources.map((source) => ({
      refId: source.refId,
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      label: source.label,
      excerpt: source.excerpt,
      content: source.content,
    })),
  };

  return [
    "Generate actionable maritime operational intelligence for this voyage.",
    "Use workflowFocus as the product surface the operator clicked.",
    "If workflow is not all, only return jobs and findings that match that workflowFocus.",
    "Always produce a voyage riskAssessment when the evidence packet has at least one source.",
    "Return only jobs that an operator can act on now.",
    "Every job must cite one or more evidenceSources by exact refId in evidenceRefs.",
    "Every finding must cite one or more evidenceSources by exact refId in evidenceRefs.",
    "Findings should capture contradictions, risks, source-backed observations, missing expected records, payment/document mismatches, ETA/position concerns, bunker/compliance concerns, and audit issues.",
    "Risk score must be 0-100 and riskLevel must be low, medium, or high. Score only from cited evidence: low 0-39, medium 40-69, high 70-100.",
    "Do not create generic checklist items. Do not infer facts without cited evidence.",
    "Use low priority for informational follow-up, medium for operational review, high for urgent risk or blocker.",
    "Return valid JSON only. Do not wrap it in markdown.",
    "The JSON object must have this shape: {\"runSummary\":\"string\",\"riskAssessment\":{\"riskScore\":0,\"riskLevel\":\"low|medium|high\",\"summary\":\"string\",\"rationale\":[\"string\"],\"confidence\":0.0,\"evidenceRefs\":[\"refId\"],\"payload\":{}},\"jobs\":[{\"jobType\":\"string\",\"priority\":\"low|medium|high\",\"title\":\"string\",\"summary\":\"string\",\"suggestedAction\":\"string\",\"confidence\":0.0,\"evidenceRefs\":[\"refId\"],\"payload\":{}}],\"findings\":[{\"findingType\":\"string\",\"severity\":\"low|medium|high\",\"confidence\":0.0,\"title\":\"string\",\"summary\":\"string\",\"suggestedAction\":\"string\",\"evidenceRefs\":[\"refId\"],\"payload\":{}}]}.",
    "",
    JSON.stringify(packet, null, 2),
  ].join("\n");
}

const voyageIntelligenceSystemPrompt = [
  "You are Syntheci, a private maritime intelligence layer.",
  "You convert voyage evidence into grounded operational jobs and findings.",
  "Use only the supplied evidence source refIds.",
  "Do not mention missing sources unless the supplied evidence directly shows the source is expected or referenced.",
  "Be concise, specific, and operational.",
].join(" ");

function workflowFocus(workflow: string) {
  const focus: Record<string, string> = {
    all: "Run the full voyage intelligence workflow: score voyage risk, identify contradictions and source-backed findings, then create the most actionable jobs across documents, finance, claims, payment, audit, changes, and operations.",
    "missing-documents": "Find missing, stale, incomplete, or referenced-but-unavailable voyage documents and evidence. Create jobs only when an operator can request, upload, verify, or chase a specific missing source.",
    watchlist: "Monitor active voyage risk and operational blockers across the available evidence. Prioritize urgent changes, missing evidence, payment blockers, compliance concerns, ETA movement, and open handoffs.",
    "pda-fda": "Review proforma and final disbursement account evidence, port cost emails, remittance status, FDA/PDA mismatches, and pending payment approvals. Focus on finance reconciliation actions.",
    "claims-pack": "Build claims-pack intelligence from cited operational evidence: SOF/NOR/laytime, ETA/arrival changes, delays, port events, cargo issues, invoices, and supporting documents needed for a defensible claim file.",
    "payment-risk": "Identify payment-release risk from invoices, FDA/PDA status, remittance instructions, missing approvals, inconsistent amounts, compliance exposure, or evidence that payment should be held pending review.",
    reconciliation: "Find contradictions, mismatches, and unresolved reconciliation issues across documents, emails, AIS, bunker records, voyage events, and finance records. Prefer source-backed conflicting facts over generic risks.",
    "change-monitor": "Detect material changes over time in ETA, destination, voyage status, cargo operations, payment state, document state, or operator instructions. Cite evidence for both the current state and the changed signal when available.",
    audit: "Assess audit readiness and source traceability. Identify unsupported claims, missing source documents, low-confidence records, evidence gaps, and controls needed before relying on the voyage record.",
    "action-plan": "Convert the strongest source-backed risks and findings into a concise operator action plan. Return practical jobs with owners implied by the work, clear suggested actions, and no passive observations.",
  };
  return focus[workflow] ?? focus.all;
}

function resolveEvidenceRefs(
  refs: string[],
  registry: VoyageEvidenceRegistry,
  evidenceByRef: Map<string, VoyageEvidenceSource>,
) {
  const resolved = new Map<string, WorkflowEvidence>();
  for (const ref of refs) {
    const refId = registry.aliases.get(ref);
    const source = refId ? evidenceByRef.get(refId) : undefined;
    if (!refId || !source) continue;
    resolved.set(refId, {
      sourceType: source.sourceType,
      sourceId: source.sourceId,
      label: source.label,
      href: source.href,
      excerpt: source.excerpt,
    });
  }
  return [...resolved.values()];
}

function normalizeJobType(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "ai_intelligence";
}

function dedupeJobs(jobs: WorkflowJobDraft[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.jobType}:${job.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeFindings(findings: ReconciliationFindingDraft[]) {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.findingType}:${finding.title.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stripFrontMatter(value: string) {
  return value.replace(/^---\n[\s\S]*?\n---\n?/, "").trim();
}

function limitText(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 3)}...` : normalized;
}

function firstSentence(value: string) {
  return value.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 320) || "";
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function parseJsonObject(text: string) {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end <= start) return {};
    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    } catch {
      return {};
    }
  }
}
