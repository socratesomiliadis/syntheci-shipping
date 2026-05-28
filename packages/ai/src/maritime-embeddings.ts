import { chunkText, type TextChunk } from "./chunking";

export type MaritimeProfileSourceType =
  | "email_thread"
  | "vessel_profile"
  | "voyage_profile"
  | "contact_profile"
  | "structured_record"
  | "scenario_profile";

export type MaritimeEmbeddingChunk = TextChunk & {
  sourceType: MaritimeProfileSourceType;
  sourceId: string;
  relatedVoyageId?: string | null;
  relatedVesselName?: string | null;
  recordType?: string | null;
  entityName?: string | null;
  metadata?: Record<string, unknown>;
};

export type EmailAttachmentInput = {
  attachment_id?: string;
  filename?: string;
  description?: string;
  content_type?: string;
  document_id?: string;
  document_type?: string;
  original_filename?: string;
  path?: string;
};

export type EmailEmbeddingInput = {
  email_id: string;
  thread_id: string;
  subject: string;
  from: string;
  to: string[];
  cc: string[];
  date: string;
  body: string;
  related_voyage_id: string;
  related_vessel_name: string;
  attachments: EmailAttachmentInput[];
};

export function buildEmailEmbeddingText(record: EmailEmbeddingInput) {
  return buildEmailEmbeddingChunks(record).map((chunk) => chunk.content).join("\n\n");
}

export function buildEmailEmbeddingChunks(record: EmailEmbeddingInput): TextChunk[] {
  const cleanedBody = cleanEmailBody(record.body);
  const attachments = formatAttachments(record.attachments);
  const detectedEntities = [
    `Vessel: ${record.related_vessel_name}`,
    `Voyage: ${record.related_voyage_id}`,
    ...record.attachments.map((attachment) => {
      const docLabel = attachment.document_type ?? attachment.description ?? attachment.original_filename;
      return docLabel ? `Document: ${formatLabel(docLabel)}` : undefined;
    }),
  ].filter(Boolean);

  const header = [
    `Email subject: ${record.subject}`,
    `From: ${record.from}`,
    `To: ${record.to.join(", ")}`,
    record.cc.length > 0 ? `Cc: ${record.cc.join(", ")}` : undefined,
    `Date: ${record.date}`,
    `Thread: ${record.thread_id}`,
  ].filter(Boolean).join("\n");

  const chunks: string[] = [
    [header, "Detected entities:", detectedEntities.join("\n")].join("\n"),
  ];

  if (cleanedBody) {
    for (const bodyChunk of chunkText(cleanedBody, 1400, 120)) {
      chunks.push([header, "Body:", bodyChunk.content, "Detected entities:", detectedEntities.join("\n")].join("\n"));
    }
  }

  if (attachments) {
    chunks.push([header, "Linked attachments:", attachments, "Detected entities:", detectedEntities.join("\n")].join("\n"));
  }

  return chunks.map(toTextChunk);
}

export function cleanEmailBody(input: string) {
  const text = decodeHtmlEntities(
    input
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<img\b[^>]*(tracking|pixel|open)[^>]*>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ");

  const kept: string[] = [];
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) {
      if (kept.at(-1)) kept.push("");
      continue;
    }
    if (isQuotedChainBoundary(line) || isBoilerplateLine(line) || isSignatureStart(line)) break;
    if (line.startsWith(">")) continue;
    kept.push(line);
  }

  return kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function buildThreadSummaryChunks(threadId: string, emails: EmailEmbeddingInput[]): MaritimeEmbeddingChunk[] {
  const sorted = [...emails].sort((left, right) => Date.parse(left.date) - Date.parse(right.date));
  const first = sorted[0];
  if (!first) return [];

  const latest = sorted.at(-1) ?? first;
  const attachments = sorted.flatMap((email) => email.attachments.map((attachment) => ({
    ...attachment,
    emailId: email.email_id,
  })));
  const bodies = sorted.map((email) => cleanEmailBody(email.body));
  const text = [
    `Email thread summary: ${threadId}`,
    `Subject: ${stripReplyPrefix(latest.subject)}`,
    `Vessel: ${latest.related_vessel_name}`,
    `Voyage: ${latest.related_voyage_id}`,
    `Latest status: ${summarizeLatestStatus(latest)}`,
    "",
    "Timeline:",
    ...sorted.map((email) => `- ${email.date}: ${email.from} - ${firstSentence(cleanEmailBody(email.body)) || email.subject}`),
    "",
    "Open questions:",
    ...extractLines(bodies, /\?|pending|await|advise|please confirm|need/i, "No explicit open questions detected."),
    "",
    "Decisions:",
    ...extractLines(bodies, /confirmed|approved|accepted|agreed|can accept|final/i, "No explicit decisions detected."),
    "",
    "Missing documents:",
    ...extractLines(bodies, /missing|pending|draft|final|await/i, "No missing document signals detected."),
    "",
    "Linked attachments:",
    ...(attachments.length > 0
      ? attachments.map((attachment) => `- ${attachment.emailId}: ${attachment.original_filename ?? attachment.filename ?? attachment.document_id ?? "Attachment"} (${formatLabel(attachment.document_type ?? attachment.description ?? "document")})`)
      : ["No linked attachments."]),
  ].join("\n");

  return chunkText(text, 1800, 160).map((chunk) => ({
    ...chunk,
    sourceType: "email_thread",
    sourceId: threadId,
    relatedVoyageId: latest.related_voyage_id,
    relatedVesselName: latest.related_vessel_name,
    recordType: "email_thread",
    entityName: stripReplyPrefix(latest.subject),
    metadata: {
      threadId,
      emailIds: sorted.map((email) => email.email_id),
      attachmentIds: attachments.map((attachment) => attachment.attachment_id).filter(Boolean),
    },
  }));
}

export function chunkDocumentForEmbedding(
  content: string,
  metadata: {
    documentId: string;
    documentType?: string;
    fileName?: string;
    relatedVoyageId?: string;
    relatedVesselName?: string;
  },
): TextChunk[] {
  const normalized = stripFrontMatter(content).replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const sections = splitDocumentSections(normalized);
  const chunks = sections.flatMap((section) => {
    const heading = [
      metadata.fileName ? `Document: ${metadata.fileName}` : undefined,
      metadata.documentType ? `Type: ${formatLabel(metadata.documentType)}` : undefined,
      metadata.relatedVoyageId ? `Voyage: ${metadata.relatedVoyageId}` : undefined,
      metadata.relatedVesselName ? `Vessel: ${metadata.relatedVesselName}` : undefined,
      section.title ? `Section: ${section.title}` : undefined,
    ].filter(Boolean).join("\n");
    return chunkText(`${heading}\nText:\n${section.text}`, 1800, 160);
  });

  return chunks.map((chunk, index) => ({ ...chunk, index }));
}

export function buildVesselProfileChunk(record: Record<string, unknown>): MaritimeEmbeddingChunk {
  const vesselName = stringValue(record.vessel_name ?? record.vesselName);
  const content = [
    `Vessel profile: ${vesselName}`,
    `IMO: ${stringValue(record.imo)}`,
    `Type: ${stringValue(record.vessel_type ?? record.vesselType)}`,
    `DWT: ${stringValue(record.dwt)}`,
    `Flag: ${stringValue(record.flag)}`,
    `Home port: ${stringValue(record.home_port ?? record.homePort)}`,
    `Operational status: ${stringValue(record.operational_status ?? record.operationalStatus)}`,
    `Capacity: ${stringValue(record.capacity)}`,
  ].join("\n");
  return toMaritimeChunk(content, "vessel_profile", stringValue(record.vessel_id ?? record.id), null, vesselName, "vessel", vesselName, record);
}

export function buildContactProfileChunk(record: Record<string, unknown>, relatedVoyages: string[] = []): MaritimeEmbeddingChunk {
  const name = stringValue(record.name);
  const content = [
    `Contact profile: ${name}`,
    `Company: ${companyFromEmail(stringValue(record.email))}`,
    `Role: ${stringValue(record.role)}`,
    `Department: ${stringValue(record.department)}`,
    `Location: ${stringValue(record.location)}`,
    `Email: ${stringValue(record.email)}`,
    `Phone: ${stringValue(record.phone)}`,
    relatedVoyages.length > 0 ? `Related voyages: ${relatedVoyages.join(", ")}` : undefined,
  ].filter(Boolean).join("\n");
  return toMaritimeChunk(content, "contact_profile", stringValue(record.person_id ?? record.id), null, null, "contact", name, {
    ...record,
    relatedVoyages,
  });
}

export function buildVoyageProfileChunk(
  record: Record<string, unknown>,
  context: {
    openIssues?: string[];
    relatedDocuments?: string[];
    operationsContact?: string;
  } = {},
): MaritimeEmbeddingChunk {
  const voyageId = stringValue(record.voyage_id ?? record.id);
  const vesselName = stringValue(record.vessel_name ?? record.vesselName);
  const content = [
    `Voyage profile: ${voyageId}`,
    `Vessel: ${vesselName}`,
    `Load port: ${stringValue(record.origin_port ?? record.originPort)}`,
    `Discharge port: ${stringValue(record.destination_port ?? record.destinationPort)}`,
    `Cargo: ${stringValue(record.cargo)}`,
    `Laycan: ${stringValue(record.laycan_start ?? record.laycanStart)} to ${stringValue(record.laycan_end ?? record.laycanEnd)}`,
    `ETD: ${stringValue(record.etd)}`,
    `ETA: ${stringValue(record.eta)}`,
    `Current status: ${formatLabel(stringValue(record.status))}`,
    context.operationsContact ? `Operations contact: ${context.operationsContact}` : undefined,
    context.openIssues?.length ? `Open issues: ${context.openIssues.join("; ")}` : undefined,
    context.relatedDocuments?.length ? `Related documents: ${context.relatedDocuments.join(", ")}` : undefined,
  ].filter(Boolean).join("\n");
  return toMaritimeChunk(content, "voyage_profile", voyageId, voyageId, vesselName, "voyage", voyageId, {
    ...record,
    ...context,
  });
}

export function buildStructuredRecordChunk(
  recordType: string,
  sourceId: string,
  content: string,
  metadata: Record<string, unknown> & { voyageId?: string; vesselName?: string; entityName?: string },
): MaritimeEmbeddingChunk {
  return toMaritimeChunk(
    content,
    "structured_record",
    sourceId,
    metadata.voyageId,
    metadata.vesselName,
    recordType,
    metadata.entityName ?? sourceId,
    metadata,
  );
}

export function buildScenarioProfileChunk(record: Record<string, unknown>): MaritimeEmbeddingChunk {
  const scenarioId = stringValue(record.scenario_id ?? record.id);
  const voyageId = stringValue(record.primary_voyage_id ?? record.primaryVoyageId);
  const vesselName = stringValue(record.primary_vessel_name ?? record.primaryVesselName);
  const content = [
    `Scenario profile: ${stringValue(record.title)}`,
    `Scenario: ${scenarioId}`,
    `Vessel: ${vesselName}`,
    `Voyage: ${voyageId}`,
    `Severity: ${stringValue(record.severity)}`,
    `Status: ${stringValue(record.status)}`,
    `Business problem: ${stringValue(record.business_problem ?? record.businessProblem)}`,
    `Narrative: ${stringValue(record.narrative)}`,
    `Expected insights: ${arrayValue(record.expected_insights ?? record.expectedInsights).join("; ")}`,
    `Suggested actions: ${arrayValue(record.suggested_actions ?? record.suggestedActions).join("; ")}`,
  ].join("\n");
  return toMaritimeChunk(content, "scenario_profile", scenarioId, voyageId, vesselName, "scenario", stringValue(record.title), record);
}

function toMaritimeChunk(
  content: string,
  sourceType: MaritimeProfileSourceType,
  sourceId: string,
  relatedVoyageId: string | null | undefined,
  relatedVesselName: string | null | undefined,
  recordType: string,
  entityName: string | null | undefined,
  metadata: Record<string, unknown>,
): MaritimeEmbeddingChunk {
  return {
    ...toTextChunk(content, 0),
    sourceType,
    sourceId,
    relatedVoyageId,
    relatedVesselName,
    recordType,
    entityName,
    metadata,
  };
}

function toTextChunk(content: string, index = 0): TextChunk {
  return {
    content: content.trim(),
    index,
    tokenEstimate: Math.ceil(content.trim().length / 4),
  };
}

function formatAttachments(attachments: EmailAttachmentInput[]) {
  return attachments
    .map((attachment) =>
      [
        `- ${attachment.original_filename ?? attachment.filename ?? attachment.document_id ?? "Attachment"}`,
        attachment.description ? `description: ${attachment.description}` : undefined,
        attachment.document_type ? `type: ${formatLabel(attachment.document_type)}` : undefined,
        attachment.document_id ? `document id: ${attachment.document_id}` : undefined,
      ].filter(Boolean).join(" | "),
    )
    .join("\n");
}

function splitDocumentSections(content: string) {
  const lines = content.split("\n");
  const sections: { title?: string; text: string }[] = [];
  let title: string | undefined;
  let buffer: string[] = [];

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+)$/.exec(line.trim());
    const page = /^Page\s+\d+/i.exec(line.trim());
    const clause = /^(\d+(?:\.\d+)*\.?)\s+([A-Z][\w\s,/&-]{3,})$/.exec(line.trim());
    const boundaryTitle = heading?.[2] ?? page?.[0] ?? clause?.[0];

    if (boundaryTitle && buffer.join("\n").trim()) {
      sections.push({ title, text: buffer.join("\n").trim() });
      buffer = [];
    }
    if (boundaryTitle) {
      title = boundaryTitle;
      buffer.push(line);
    } else {
      buffer.push(line);
    }
  }

  if (buffer.join("\n").trim()) sections.push({ title, text: buffer.join("\n").trim() });
  return sections.length > 0 ? sections : [{ text: content }];
}

function stripFrontMatter(content: string) {
  return content.replace(/^---\n[\s\S]*?\n---\n?/, "");
}

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, "'");
}

function isQuotedChainBoundary(line: string) {
  return /^-{2,}\s*(Original Message|Forwarded message)\s*-{2,}$/i.test(line) || /^On .+ wrote:$/i.test(line);
}

function isBoilerplateLine(line: string) {
  return /unsubscribe|confidentiality notice|intended recipient|virus|privileged|tracking pixel/i.test(line);
}

function isSignatureStart(line: string) {
  return /^(regards|best regards|kind regards|thanks|thank you|sent from my)\b/i.test(line);
}

function summarizeLatestStatus(email: EmailEmbeddingInput) {
  const body = cleanEmailBody(email.body);
  return firstSentence(body) || email.subject;
}

function extractLines(values: string[], pattern: RegExp, fallback: string) {
  const matches = values
    .flatMap((value) => value.split(/\n+/))
    .map((line) => line.trim())
    .filter((line) => pattern.test(line))
    .slice(0, 8);
  return matches.length > 0 ? matches.map((line) => `- ${line}`) : [`- ${fallback}`];
}

function firstSentence(value: string) {
  return value.split(/(?<=[.!?])\s+/)[0]?.trim() ?? "";
}

function stripReplyPrefix(subject: string) {
  return subject.replace(/^(re|fw|fwd):\s*/gi, "").trim();
}

function formatLabel(value: string) {
  return value.replace(/[._/-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function stringValue(value: unknown) {
  return value === null || value === undefined ? "" : String(value);
}

function arrayValue(value: unknown) {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function companyFromEmail(email: string) {
  const domain = email.split("@")[1]?.split(".")[0];
  return domain ? formatLabel(domain) : "Unknown";
}
