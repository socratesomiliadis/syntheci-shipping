import { z } from "zod";
import { automationCadences } from "./maritime";

export const createDocumentSchema = z.object({
  fileName: z.string().min(1),
  contentType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
});

export const enqueueIngestionSchema = z.object({
  documentId: z.string().min(1),
});

export const chatRequestSchema = z.object({
  threadId: z.string().optional(),
  message: z.string().min(1),
});

export const createAutomationSchema = z.object({
  name: z.string().min(1),
  question: z.string().min(1),
  cadence: z.enum(automationCadences).default("manual"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export type EnqueueIngestionInput = z.infer<typeof enqueueIngestionSchema>;
export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
export type CreateAutomationInput = z.infer<typeof createAutomationSchema>;
