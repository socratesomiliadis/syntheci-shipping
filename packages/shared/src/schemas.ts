import { z } from "zod";
import { automationCadences, chatFeedbackRatings, operationalJobPriorities, operationalJobStatuses } from "./maritime";

export const intelligenceWorkflowSchema = z.enum([
  "missing-documents",
  "watchlist",
  "pda-fda",
  "claims-pack",
  "payment-risk",
  "reconciliation",
  "change-monitor",
  "audit",
  "action-plan",
  "all",
]);

export const workflowEvidenceSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  label: z.string(),
  href: z.string().optional(),
  excerpt: z.string().optional(),
});

export const extractedFieldSchema = z.object({
  name: z.string().min(1),
  value: z.string().min(1),
  confidence: z.number().min(0).max(1),
  excerpt: z.string().default(""),
});

export const documentExtractionSchema = z.object({
  documentId: z.string().min(1),
  voyageId: z.string().min(1),
  vesselName: z.string().min(1),
  documentType: z.string().min(1),
  fields: z.array(extractedFieldSchema),
  confidence: z.number().min(0).max(1),
  status: z.enum(["extracted", "partial", "needs_review"]),
  evidence: z.array(workflowEvidenceSchema).default([]),
});

export const reconciliationFindingSchema = z.object({
  findingType: z.string().min(1),
  voyageId: z.string().min(1),
  severity: z.enum(["low", "medium", "high"]),
  confidence: z.number().min(0).max(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(workflowEvidenceSchema).default([]),
  suggestedAction: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const aiVoyageIntelligenceJobSchema = z.object({
  jobType: z.string().min(1),
  priority: z.enum(operationalJobPriorities),
  title: z.string().min(1),
  summary: z.string().min(1),
  suggestedAction: z.string().min(1),
  confidence: z.number().min(0).max(1),
  evidenceRefs: z.array(z.string().min(1)).min(1),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const aiVoyageIntelligenceOutputSchema = z.object({
  runSummary: z.string().min(1),
  jobs: z.array(aiVoyageIntelligenceJobSchema).default([]),
  findings: z.array(reconciliationFindingSchema).default([]),
});

export const sourceConfidenceSchema = z.object({
  level: z.enum(["primary", "structured", "thread", "inferred", "weak"]),
  score: z.number().min(0).max(1),
  label: z.string().min(1),
  rationale: z.string().min(1),
});

export const parsedWorkflowIntentSchema = z.object({
  workflow: intelligenceWorkflowSchema,
  scope: z.enum(["all-voyages", "single-voyage"]),
  voyageId: z.string().optional(),
  cadence: z.enum(automationCadences),
  conditionSummary: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

export const externalEmailImportSchema = z.object({
  id: z.string().min(1),
  threadId: z.string().min(1),
  subject: z.string().min(1),
  from: z.string().min(1),
  to: z.array(z.string()).default([]),
  cc: z.array(z.string()).default([]),
  sentAt: z.string().min(1),
  body: z.string().default(""),
  relatedVoyageId: z.string().min(1),
  relatedVesselName: z.string().min(1),
  attachments: z.array(z.record(z.string(), z.unknown())).default([]),
});

export const externalDocumentImportSchema = z.object({
  id: z.string().min(1),
  fileName: z.string().min(1),
  content: z.string().min(1),
  contentType: z.string().default("text/plain"),
  documentType: z.string().min(1),
  relatedVoyageId: z.string().min(1),
  relatedVesselName: z.string().min(1),
  sourceEmailId: z.string().default("external-import"),
  sourceAttachmentId: z.string().default("external-import"),
  originalAttachmentFilename: z.string().optional(),
  sourceCreatedAt: z.string().min(1),
});

export const externalAisImportSchema = z.object({
  id: z.string().min(1),
  voyageId: z.string().min(1),
  vesselName: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  speedKnots: z.number(),
  heading: z.number().int(),
  positionTimestamp: z.string().min(1),
  destination: z.string().min(1),
  eta: z.string().min(1),
});

export const externalFinanceImportSchema = z.object({
  id: z.string().min(1),
  voyageId: z.string().min(1),
  vesselName: z.string().min(1),
  recordType: z.enum(["pda", "fda", "invoice", "bunker_report", "payment"]),
  amount: z.number().optional(),
  currency: z.string().optional(),
  status: z.string().optional(),
  description: z.string().default(""),
  raw: z.record(z.string(), z.unknown()).default({}),
});

export const externalImportPayloadSchema = z.object({
  provider: z.string().min(1).default("external"),
  sourceType: z.enum(["email", "document", "ais", "finance"]),
  emails: z.array(externalEmailImportSchema).default([]),
  documents: z.array(externalDocumentImportSchema).default([]),
  aisPositions: z.array(externalAisImportSchema).default([]),
  financeRecords: z.array(externalFinanceImportSchema).default([]),
});

export const createDocumentSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const enqueueIngestionSchema = z.object({
  documentId: z.string().min(1),
});

export const chatRequestSchema = z
  .object({
    threadId: z.string().optional(),
    message: z.string().min(1).optional(),
    messages: z.array(z.unknown()).optional(),
  })
  .refine((input) => input.message || (input.messages && input.messages.length > 0), {
    message: "A message or message history is required.",
  });

export const createAutomationSchema = z.object({
  name: z.string().min(1),
  question: z.string().min(1),
  cadence: z.enum(automationCadences).default("manual"),
  workflow: intelligenceWorkflowSchema.optional(),
  voyageId: z.string().optional(),
});

export const upsertOperationalJobSchema = z.object({
  voyageId: z.string().min(1),
  jobType: z.string().min(1),
  status: z.enum(operationalJobStatuses).default("open"),
  priority: z.enum(operationalJobPriorities).default("medium"),
  title: z.string().min(1),
  summary: z.string().min(1),
  evidence: z.array(z.record(z.string(), z.unknown())).default([]),
  payload: z.record(z.string(), z.unknown()).default({}),
});

export const updateOperationalJobSchema = z.object({
  status: z.enum(operationalJobStatuses).optional(),
  priority: z.enum(operationalJobPriorities).optional(),
  title: z.string().min(1).optional(),
  summary: z.string().min(1).optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const chatFeedbackSchema = z.object({
  messageId: z.string().min(1),
  rating: z.enum(chatFeedbackRatings),
  note: z.string().max(1000).optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type EnqueueIngestionInput = z.infer<typeof enqueueIngestionSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
export type UpsertOperationalJobInput = z.infer<typeof upsertOperationalJobSchema>;
export type UpdateOperationalJobInput = z.infer<typeof updateOperationalJobSchema>;
export type ChatFeedbackInput = z.infer<typeof chatFeedbackSchema>;
export type IntelligenceWorkflowInput = z.infer<typeof intelligenceWorkflowSchema>;
export type AiVoyageIntelligenceJobInput = z.infer<typeof aiVoyageIntelligenceJobSchema>;
export type AiVoyageIntelligenceOutputInput = z.infer<typeof aiVoyageIntelligenceOutputSchema>;
export type DocumentExtractionInput = z.infer<typeof documentExtractionSchema>;
export type ReconciliationFindingInput = z.infer<typeof reconciliationFindingSchema>;
export type SourceConfidenceInput = z.infer<typeof sourceConfidenceSchema>;
export type ParsedWorkflowIntentInput = z.infer<typeof parsedWorkflowIntentSchema>;
export type ExternalImportPayloadInput = z.infer<typeof externalImportPayloadSchema>;
