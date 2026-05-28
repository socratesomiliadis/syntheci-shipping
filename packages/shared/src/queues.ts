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
  workflow: z.enum(["watchlist", "missing-documents", "pda-fda", "claims-pack", "payment-risk", "all"]).default("watchlist"),
  voyageId: z.string().optional(),
});

export const automationQueueJobSchema = z.union([automationJobSchema, workflowAutomationJobSchema]);

export type IngestionJob = z.infer<typeof ingestionJobSchema>;
export type AutomationJob = z.infer<typeof automationJobSchema>;
export type WorkflowAutomationJob = z.infer<typeof workflowAutomationJobSchema>;
export type AutomationQueueJob = z.infer<typeof automationQueueJobSchema>;
