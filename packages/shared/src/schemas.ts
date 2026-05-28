import { z } from "zod";
import { automationCadences, chatFeedbackRatings, operationalJobPriorities, operationalJobStatuses } from "./maritime";

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
