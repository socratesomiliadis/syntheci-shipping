import { relations, sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  vector,
} from "drizzle-orm/pg-core";
import { EMBEDDING_DIMENSIONS } from "@syntheci/shared";

export const workspaceRoleEnum = pgEnum("workspace_role", ["owner", "admin", "analyst", "viewer"]);
export const documentStatusEnum = pgEnum("document_status", [
  "uploaded",
  "queued",
  "processing",
  "ready",
  "failed",
]);
export const automationCadenceEnum = pgEnum("automation_cadence", ["manual", "hourly", "daily", "weekly"]);
export const automationRunStatusEnum = pgEnum("automation_run_status", [
  "queued",
  "running",
  "completed",
  "failed",
]);
export const queueJobStatusEnum = pgEnum("queue_job_status", ["queued", "active", "completed", "failed"]);
export const chatMessageRoleEnum = pgEnum("chat_message_role", ["user", "assistant", "system"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { mode: "date" }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { mode: "date" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const workspaces = pgTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: workspaceRoleEnum("role").notNull().default("viewer"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("workspace_members_workspace_user_idx").on(table.workspaceId, table.userId)],
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    uploadedByUserId: text("uploaded_by_user_id").references(() => user.id, { onDelete: "set null" }),
    fileName: text("file_name").notNull(),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    status: documentStatusEnum("status").notNull().default("uploaded"),
    error: text("error"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("documents_workspace_idx").on(table.workspaceId),
    uniqueIndex("documents_object_key_idx").on(table.objectKey),
  ],
);

export const documentChunks = pgTable(
  "document_chunks",
  {
    id: text("id").primaryKey(),
    documentId: text("document_id")
      .notNull()
      .references(() => documents.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenEstimate: integer("token_estimate").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("document_chunks_document_idx").on(table.documentId),
    index("document_chunks_workspace_idx").on(table.workspaceId),
    index("document_chunks_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  ],
);

export const chatThreads = pgTable("chat_threads", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull().default("Maritime brief"),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  threadId: text("thread_id")
    .notNull()
    .references(() => chatThreads.id, { onDelete: "cascade" }),
  role: chatMessageRoleEnum("role").notNull(),
  content: text("content").notNull(),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const citations = pgTable("citations", {
  id: text("id").primaryKey(),
  messageId: text("message_id")
    .notNull()
    .references(() => chatMessages.id, { onDelete: "cascade" }),
  documentId: text("document_id")
    .notNull()
    .references(() => documents.id, { onDelete: "cascade" }),
  chunkId: text("chunk_id")
    .notNull()
    .references(() => documentChunks.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  excerpt: text("excerpt").notNull(),
});

export const automationRules = pgTable("automation_rules", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  question: text("question").notNull(),
  cadence: automationCadenceEnum("cadence").notNull().default("manual"),
  enabled: boolean("enabled").notNull().default(true),
  createdByUserId: text("created_by_user_id").references(() => user.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const automationRuns = pgTable("automation_runs", {
  id: text("id").primaryKey(),
  automationRuleId: text("automation_rule_id")
    .notNull()
    .references(() => automationRules.id, { onDelete: "cascade" }),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  status: automationRunStatusEnum("status").notNull().default("queued"),
  summary: text("summary"),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { mode: "date" }),
});

export const queueJobs = pgTable("queue_jobs", {
  id: text("id").primaryKey(),
  queueName: text("queue_name").notNull(),
  jobId: text("job_id").notNull(),
  workspaceId: text("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  documentId: text("document_id").references(() => documents.id, { onDelete: "cascade" }),
  automationRunId: text("automation_run_id").references(() => automationRuns.id, { onDelete: "cascade" }),
  status: queueJobStatusEnum("status").notNull().default("queued"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  error: text("error"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  documents: many(documents),
}));

export const documentRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
}));

export const chatThreadRelations = relations(chatThreads, ({ many }) => ({
  messages: many(chatMessages),
}));

export const vectorExtensionSql = sql`CREATE EXTENSION IF NOT EXISTS vector`;
