import type { OperationalJobPriority } from "./maritime";

export type WorkflowEvidence = {
  sourceType: string;
  sourceId: string;
  label: string;
  href?: string;
  excerpt?: string;
};

export type WorkflowJobDraft = {
  jobType: string;
  priority: OperationalJobPriority;
  title: string;
  summary: string;
  evidence: WorkflowEvidence[];
  payload: Record<string, unknown>;
};

export type WorkflowVoyage = {
  id: string;
  vesselName: string;
  originPort?: string;
  destinationPort?: string;
  cargo?: string;
  laycanStart?: string;
  laycanEnd?: string;
  etd?: string;
  eta?: string;
  status?: string;
};

export type WorkflowDocument = {
  id: string;
  fileName: string;
  documentType?: string | null;
  sourceCreatedAt?: string | null;
  content?: string | null;
};

export type WorkflowEmail = {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  sentAt: string;
  body: string;
  attachments?: { document_id?: string; document_type?: string; original_filename?: string; description?: string }[];
};

export type WorkflowEvent = {
  id: string;
  eventType: string;
  eventTime: string;
  location?: string;
  severity: string;
  description: string;
};

export type WorkflowComplianceFlag = {
  id: string;
  euEtsExposure: boolean;
  fueleuRisk: boolean;
  mrvMissingData: boolean;
  ciiRisk: boolean;
  riskScore: number;
  riskLevel: string;
  rationale: string[];
  lastEvaluatedAt: string;
};

export type WorkflowAisPosition = {
  id: string;
  positionTimestamp: string;
  destination: string;
  eta: string;
  speedKnots: number;
};

export type WorkflowContext = {
  voyage: WorkflowVoyage;
  documents: WorkflowDocument[];
  emails: WorkflowEmail[];
  events: WorkflowEvent[];
  complianceFlag?: WorkflowComplianceFlag | null;
  aisPositions: WorkflowAisPosition[];
};

export type TimelineItem = {
  id: string;
  kind: "event" | "email" | "document" | "ais" | "compliance";
  timestamp: string;
  title: string;
  detail: string;
  severity: OperationalJobPriority;
  href?: string;
};

export type CharterpartyClause = {
  key: string;
  title: string;
  text: string;
  evidence: WorkflowEvidence[];
};

const requiredDocumentRules = [
  {
    type: "voyage_order",
    label: "Voyage order",
    reason: "Voyage file needs standing operational instructions.",
    required: () => true,
  },
  {
    type: "charterparty_excerpt",
    label: "Charterparty excerpt",
    reason: "Charterparty terms are needed for laycan, demurrage, documents, ETS/FuelEU allocation, and claims positions.",
    required: (context: WorkflowContext) =>
      hasAnySignal(context, ["charterparty", "laycan", "demurrage", "claim", "nor", "statement of facts", "ets", "fueleu"]),
  },
  {
    type: "bunker_fuel_document",
    label: "Bunker/fuel evidence",
    reason: "Fuel evidence is needed for MRV, ETS, FuelEU, bunker reconciliation, or payment review.",
    required: (context: WorkflowContext) =>
      Boolean(context.complianceFlag?.mrvMissingData || context.complianceFlag?.fueleuRisk || context.complianceFlag?.euEtsExposure) ||
      hasAnySignal(context, ["bunker", "bdn", "fuel", "mrv", "invoice"]),
  },
  {
    type: "notice_of_readiness",
    label: "Notice of readiness",
    reason: "NOR evidence is needed before laytime, demurrage, or anchorage waiting time can be relied on.",
    required: (context: WorkflowContext) => hasAnySignal(context, ["nor", "notice of readiness", "laytime", "demurrage", "anchorage"]),
  },
  {
    type: "statement_of_facts",
    label: "Statement of facts",
    reason: "SOF evidence is needed to validate delay, waiting time, rain stoppage, and claims positions.",
    required: (context: WorkflowContext) => hasAnySignal(context, ["statement of facts", "sof", "laytime", "delay", "claim", "stoppage"]),
  },
  {
    type: "port_weather_notice",
    label: "Port/weather notice",
    reason: "Port/weather evidence is needed where berth, pilotage, draft, weather, or ETA risk is active.",
    required: (context: WorkflowContext) => hasAnySignal(context, ["weather", "berth", "pilot", "draft", "eta", "congestion"]),
  },
  {
    type: "pda",
    label: "PDA",
    reason: "PDA evidence is needed when agency funding or finance approval is pending.",
    required: (context: WorkflowContext) => hasAnySignal(context, ["pda", "proforma", "finance review", "funding request"]),
  },
  {
    type: "fda",
    label: "FDA",
    reason: "FDA evidence is needed before final port cost comparison or payment clearance.",
    required: (context: WorkflowContext) => hasAnySignal(context, ["fda", "final disbursement", "pending items", "port dues"]),
  },
];

export function detectMissingDocuments(context: WorkflowContext): WorkflowJobDraft[] {
  const available = new Set(context.documents.map((document) => normalizeDocumentType(document.documentType ?? document.fileName)));
  return requiredDocumentRules
    .filter((rule) => rule.required(context) && !available.has(rule.type))
    .map((rule) => ({
      jobType: "missing_document",
      priority: rule.type === "voyage_order" || rule.type === "charterparty_excerpt" ? "high" : "medium",
      title: `Missing ${rule.label} for ${context.voyage.id}`,
      summary: rule.reason,
      evidence: contextEvidence(context, 4),
      payload: { missingDocumentType: rule.type, voyageId: context.voyage.id },
    }));
}

export function buildWatchlistJobs(context: WorkflowContext): WorkflowJobDraft[] {
  const jobs: WorkflowJobDraft[] = [];
  const compliance = context.complianceFlag;
  if (compliance && (compliance.riskLevel === "high" || compliance.riskScore >= 70)) {
    jobs.push({
      jobType: "watchlist_risk",
      priority: "high",
      title: `High compliance risk on ${context.voyage.id}`,
      summary: compliance.rationale.join("; ") || "Compliance risk requires review.",
      evidence: [complianceEvidence(compliance)],
      payload: { riskScore: compliance.riskScore, riskLevel: compliance.riskLevel },
    });
  }

  for (const event of context.events.filter((item) => ["high", "medium", "watch"].includes(item.severity.toLowerCase()))) {
    jobs.push({
      jobType: "watchlist_event",
      priority: event.severity.toLowerCase() === "high" ? "high" : "medium",
      title: `${formatLabel(event.eventType)} on ${context.voyage.id}`,
      summary: event.description,
      evidence: [eventEvidence(event)],
      payload: { eventId: event.id, eventType: event.eventType },
    });
  }

  jobs.push(...detectPaymentRisk(context));
  jobs.push(...detectMissingDocuments(context).slice(0, 3));
  return dedupeJobDrafts(jobs);
}

export function buildTimeline(context: WorkflowContext): TimelineItem[] {
  const items: TimelineItem[] = [
    ...context.events.map((event) => ({
      id: event.id,
      kind: "event" as const,
      timestamp: event.eventTime,
      title: formatLabel(event.eventType),
      detail: event.description,
      severity: toPriority(event.severity),
    })),
    ...context.emails.map((email) => ({
      id: email.id,
      kind: "email" as const,
      timestamp: email.sentAt,
      title: email.subject,
      detail: `${email.from}: ${firstSentence(email.body)}`,
      severity: textPriority(`${email.subject} ${email.body}`),
      href: `/workspace/sources?type=email&id=${email.id}`,
    })),
    ...context.documents.map((document) => ({
      id: document.id,
      kind: "document" as const,
      timestamp: document.sourceCreatedAt ?? "",
      title: document.fileName,
      detail: formatLabel(document.documentType ?? "document"),
      severity: textPriority(`${document.fileName} ${document.content ?? ""}`),
      href: `/workspace/sources?type=file&id=${document.id}`,
    })),
    ...context.aisPositions.map((position) => ({
      id: position.id,
      kind: "ais" as const,
      timestamp: position.positionTimestamp,
      title: `AIS update to ${position.destination}`,
      detail: `ETA ${position.eta}; speed ${position.speedKnots} knots.`,
      severity: "low" as const,
    })),
  ];

  if (context.complianceFlag) {
    items.push({
      id: context.complianceFlag.id,
      kind: "compliance",
      timestamp: context.complianceFlag.lastEvaluatedAt,
      title: `${formatLabel(context.complianceFlag.riskLevel)} compliance risk`,
      detail: context.complianceFlag.rationale.join("; "),
      severity: toPriority(context.complianceFlag.riskLevel),
    });
  }

  return items
    .filter((item) => item.timestamp)
    .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp));
}

export function extractCharterpartyClauses(context: WorkflowContext): CharterpartyClause[] {
  const charterDocs = context.documents.filter((document) => normalizeDocumentType(document.documentType ?? document.fileName) === "charterparty_excerpt");
  const text = charterDocs.map((document) => document.content ?? "").join("\n");
  const evidence = charterDocs.map(documentEvidence);
  const rules = [
    ["laycan", "Laycan", /laycan[:\s-]+([^\n.]+[.]?)/i],
    ["nor", "NOR / tendering", /(nor|notice of readiness|tender)[^\n.]*[.]?/i],
    ["demurrage", "Demurrage / laytime", /(demurrage|laytime)[^\n.]*[.]?/i],
    ["documents", "Document responsibilities", /(documentary responsibilities|documents?|evidence)[^\n.]*[.]?/i],
    ["ets_fueleu", "ETS / FuelEU allocation", /(eu ets|fueleu|emissions)[^\n.]*[.]?/i],
    ["exceptions", "Exceptions / reservations", /(exception|reservation|weather|reversible time)[^\n.]*[.]?/i],
  ] as const;

  return rules.map(([key, title, pattern]) => ({
    key,
    title,
    text: text.match(pattern)?.[0]?.trim() || "No explicit clause found in indexed charterparty excerpts.",
    evidence,
  }));
}

export function draftReply(context: WorkflowContext) {
  const latest = [...context.emails].sort((left, right) => Date.parse(right.sentAt) - Date.parse(left.sentAt))[0];
  const missing = detectMissingDocuments(context).slice(0, 3);
  const risk = context.complianceFlag?.rationale.slice(0, 2) ?? [];
  const subject = latest?.subject?.startsWith("Re:") ? latest.subject : `Re: ${latest?.subject ?? context.voyage.id}`;
  const body = [
    "Good day,",
    "",
    `For ${context.voyage.vesselName} / ${context.voyage.id}, we are reviewing the current voyage file before closing the next action.`,
    missing.length ? `Please provide: ${missing.map((job) => String(job.payload.missingDocumentType)).join(", ")}.` : "The currently indexed voyage documents do not show an obvious mandatory gap.",
    risk.length ? `Current risk notes: ${risk.join("; ")}.` : undefined,
    "",
    "We will keep the position provisional until the above evidence is confirmed and linked to the voyage file.",
    "",
    "Regards,",
    "Operations Desk",
  ].filter(Boolean).join("\n");

  return {
    subject,
    body,
    evidence: [...missing.flatMap((job) => job.evidence), ...contextEvidence(context, 3)],
  };
}

export function comparePdaFda(context: WorkflowContext): WorkflowJobDraft[] {
  const pdaDocs = findDocuments(context, ["pda", "proforma"]);
  const fdaDocs = findDocuments(context, ["fda", "final disbursement"]);
  if (pdaDocs.length === 0 && fdaDocs.length === 0) return [];

  const summary =
    pdaDocs.length > 0 && fdaDocs.length > 0
      ? "PDA and FDA evidence are both indexed; compare disputed port-cost items, launch service, anchorage attendance, overtime, and ordinary port dues."
      : "Only one side of the PDA/FDA comparison is indexed, so finance should request the missing disbursement evidence before approval.";

  return [{
    jobType: "pda_fda_comparison",
    priority: fdaDocs.length === 0 ? "high" : "medium",
    title: `PDA/FDA comparison for ${context.voyage.id}`,
    summary,
    evidence: [...pdaDocs, ...fdaDocs].map(documentEvidence),
    payload: { pdaDocumentIds: pdaDocs.map((doc) => doc.id), fdaDocumentIds: fdaDocs.map((doc) => doc.id) },
  }];
}

export function buildClaimsEvidencePack(context: WorkflowContext): WorkflowJobDraft[] {
  const claimsDocs = findDocuments(context, ["claim", "statement_of_facts", "notice_of_readiness", "charterparty_excerpt"]);
  const claimEvents = context.events.filter((event) => /delay|weather|berth|claim|stoppage|anchorage/i.test(`${event.eventType} ${event.description}`));
  if (claimsDocs.length === 0 && claimEvents.length === 0) return [];

  return [{
    jobType: "claims_evidence_pack",
    priority: claimEvents.some((event) => event.severity === "high") ? "high" : "medium",
    title: `Claims evidence pack for ${context.voyage.id}`,
    summary: "Assemble charterparty terms, NOR/SOF evidence, delay events, weather interruptions, and claims correspondence before sharing a position externally.",
    evidence: [...claimsDocs.map(documentEvidence), ...claimEvents.map(eventEvidence)],
    payload: { documentIds: claimsDocs.map((doc) => doc.id), eventIds: claimEvents.map((event) => event.id) },
  }];
}

export function detectPaymentRisk(context: WorkflowContext): WorkflowJobDraft[] {
  const paymentDocs = findDocuments(context, ["pda", "fda", "invoice", "payment", "finance"]);
  const paymentText = [context.emails.map((email) => `${email.subject} ${email.body}`).join(" "), context.documents.map((doc) => `${doc.fileName} ${doc.content ?? ""}`).join(" ")].join(" ");
  if (!/payment|finance review|funding request|invoice|pda|fda|remittance|pending/i.test(paymentText)) return [];

  return [{
    jobType: "payment_risk",
    priority: /pending|disputed|hold|finance review|approval/i.test(paymentText) ? "high" : "medium",
    title: `Payment-risk review for ${context.voyage.id}`,
    summary: "Finance/payment language is present; verify PDA/FDA support, disputed items, approvals, and remittance readiness before releasing funds.",
    evidence: paymentDocs.length ? paymentDocs.map(documentEvidence) : contextEvidence(context, 4),
    payload: { documentIds: paymentDocs.map((doc) => doc.id) },
  }];
}

export function buildWorkflowJobs(context: WorkflowContext) {
  return dedupeJobDrafts([
    ...detectMissingDocuments(context),
    ...buildWatchlistJobs(context),
    ...comparePdaFda(context),
    ...buildClaimsEvidencePack(context),
    ...detectPaymentRisk(context),
  ]);
}

function hasAnySignal(context: WorkflowContext, terms: string[]) {
  const haystack = [
    context.voyage.cargo,
    context.voyage.status,
    context.documents.map((document) => `${document.fileName} ${document.documentType ?? ""} ${document.content ?? ""}`).join(" "),
    context.emails.map((email) => `${email.subject} ${email.body}`).join(" "),
    context.events.map((event) => `${event.eventType} ${event.description}`).join(" "),
    context.complianceFlag?.rationale.join(" "),
  ].filter(Boolean).join(" ").toLowerCase();
  return terms.some((term) => haystack.includes(term.toLowerCase()));
}

function findDocuments(context: WorkflowContext, terms: string[]) {
  return context.documents.filter((document) => {
    const haystack = `${document.fileName} ${document.documentType ?? ""} ${document.content ?? ""}`.toLowerCase();
    return terms.some((term) => haystack.includes(term.toLowerCase()));
  });
}

function contextEvidence(context: WorkflowContext, limit: number) {
  return [
    ...context.documents.slice(0, limit).map(documentEvidence),
    ...context.emails.slice(0, Math.max(0, limit - context.documents.length)).map(emailEvidence),
  ].slice(0, limit);
}

function documentEvidence(document: WorkflowDocument): WorkflowEvidence {
  return {
    sourceType: "file",
    sourceId: document.id,
    label: document.fileName,
    href: `/workspace/sources?type=file&id=${document.id}`,
    excerpt: firstSentence(document.content ?? formatLabel(document.documentType ?? "document")),
  };
}

function emailEvidence(email: WorkflowEmail): WorkflowEvidence {
  return {
    sourceType: "email",
    sourceId: email.id,
    label: email.subject,
    href: `/workspace/sources?type=email&id=${email.id}`,
    excerpt: firstSentence(email.body),
  };
}

function eventEvidence(event: WorkflowEvent): WorkflowEvidence {
  return {
    sourceType: "voyage_event",
    sourceId: event.id,
    label: formatLabel(event.eventType),
    excerpt: event.description,
  };
}

function complianceEvidence(flag: WorkflowComplianceFlag): WorkflowEvidence {
  return {
    sourceType: "compliance_flag",
    sourceId: flag.id,
    label: `${formatLabel(flag.riskLevel)} risk`,
    excerpt: flag.rationale.join("; "),
  };
}

function normalizeDocumentType(value: string) {
  const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  if (normalized.includes("charterparty")) return "charterparty_excerpt";
  if (normalized.includes("voyage_order")) return "voyage_order";
  if (normalized.includes("bunker") || normalized.includes("bdn") || normalized.includes("fuel")) return "bunker_fuel_document";
  if (normalized.includes("notice_of_readiness") || normalized.includes("nor")) return "notice_of_readiness";
  if (normalized.includes("statement_of_facts") || normalized.includes("sof")) return "statement_of_facts";
  if (normalized.includes("weather") || normalized.includes("port_notice")) return "port_weather_notice";
  if (normalized.includes("pda")) return "pda";
  if (normalized.includes("fda")) return "fda";
  return normalized;
}

function textPriority(text: string): OperationalJobPriority {
  if (/urgent|high|missing|pending|disputed|claim|risk|hold/i.test(text)) return "high";
  if (/watch|draft|review|delay|weather|berth|finance/i.test(text)) return "medium";
  return "low";
}

function toPriority(value: string): OperationalJobPriority {
  const normalized = value.toLowerCase();
  if (normalized === "high" || normalized.includes("high")) return "high";
  if (normalized === "medium" || normalized === "watch" || normalized.includes("medium")) return "medium";
  return "low";
}

function firstSentence(value: string) {
  return value.replace(/\s+/g, " ").trim().split(/(?<=[.!?])\s+/)[0]?.slice(0, 240) || "";
}

function formatLabel(value: string) {
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dedupeJobDrafts(jobs: WorkflowJobDraft[]) {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    const key = `${job.jobType}:${job.title}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
