import { z } from "zod";

export const QUEUES = {
  ingestion: "syntheci.ingestion",
  automation: "syntheci.automation",
} as const;

export const ingestionJobSchema = z.object({
  documentId: z.string().min(1),
  workspaceId: z.string().min(1),
  objectKey: z.string().min(1),
  fileName: z.string().min(1),
  contentType: z.string().optional(),
});

export const automationJobSchema = z.object({
  automationRuleId: z.string().min(1),
  workspaceId: z.string().min(1),
  runId: z.string().min(1),
  question: z.string().min(1),
  kind: z.literal("brief").default("brief"),
});

export const workflowAutomationJobSchema = z.object({
  automationRuleId: z.string().min(1),
  workspaceId: z.string().min(1),
  runId: z.string().min(1),
  kind: z.literal("workflow"),
  workflow: z.enum([
    "watchlist",
    "missing-documents",
    "pda-fda",
    "claims-pack",
    "payment-risk",
    "reconciliation",
    "change-monitor",
    "audit",
    "action-plan",
    "all",
  ]).default("watchlist"),
  voyageId: z.string().optional(),
});

export const intelligenceQueueJobSchema = z.object({
  automationRuleId: z.string().min(1).optional(),
  workspaceId: z.string().min(1),
  runId: z.string().min(1).optional(),
  kind: z.enum(["document-extraction", "voyage-reconciliation", "voyage-change-monitor", "audit-check"]),
  voyageId: z.string().optional(),
  documentId: z.string().optional(),
});

export const automationQueueJobSchema = z.union([automationJobSchema, workflowAutomationJobSchema, intelligenceQueueJobSchema]);

export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type AutomationJob = z.infer<typeof automationJobSchema>;
export type WorkflowAutomationJob = z.infer<typeof workflowAutomationJobSchema>;
export type IntelligenceQueueJob = z.infer<typeof intelligenceQueueJobSchema>;
export type AutomationQueueJob = z.infer<typeof automationQueueJobSchema>;
