import { relations, sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
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
export const operationalJobStatusEnum = pgEnum("operational_job_status", [
  "open",
  "in_progress",
  "resolved",
  "dismissed",
]);
export const operationalJobPriorityEnum = pgEnum("operational_job_priority", ["low", "medium", "high"]);
export const chatFeedbackRatingEnum = pgEnum("chat_feedback_rating", ["up", "down"]);

const rawMetadata = () => jsonb("raw").$type<Record<string, unknown>>().notNull().default({});

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

export const chatFeedback = pgTable(
  "chat_feedback",
  {
    id: text("id").primaryKey(),
    messageId: text("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    rating: chatFeedbackRatingEnum("rating").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_feedback_workspace_idx").on(table.workspaceId),
    index("chat_feedback_message_idx").on(table.messageId),
    uniqueIndex("chat_feedback_message_workspace_idx").on(table.messageId, table.workspaceId),
  ],
);

export const operationalJobs = pgTable(
  "operational_jobs",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    voyageId: text("voyage_id").notNull(),
    jobType: text("job_type").notNull(),
    status: operationalJobStatusEnum("status").notNull().default("open"),
    priority: operationalJobPriorityEnum("priority").notNull().default("medium"),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    evidence: jsonb("evidence").$type<Record<string, unknown>[]>().notNull().default([]),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("operational_jobs_workspace_idx").on(table.workspaceId),
    index("operational_jobs_voyage_idx").on(table.workspaceId, table.voyageId),
    index("operational_jobs_status_idx").on(table.workspaceId, table.status),
    index("operational_jobs_type_idx").on(table.workspaceId, table.jobType),
  ],
);

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

export const maritimeVessels = pgTable(
  "maritime_vessels",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    vesselName: text("vessel_name").notNull(),
    imo: text("imo").notNull(),
    vesselType: text("vessel_type").notNull(),
    dwt: integer("dwt").notNull(),
    flag: text("flag").notNull(),
    yearBuilt: integer("year_built").notNull(),
    capacity: text("capacity").notNull(),
    homePort: text("home_port").notNull(),
    operationalStatus: text("operational_status").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_vessels_workspace_idx").on(table.workspaceId),
    uniqueIndex("maritime_vessels_workspace_imo_idx").on(table.workspaceId, table.imo),
  ],
);

export const maritimePorts = pgTable(
  "maritime_ports",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    portName: text("port_name").notNull(),
    country: text("country").notNull(),
    region: text("region").notNull(),
    portType: text("port_type").notNull(),
    berths: integer("berths").notNull(),
    maxDraftM: doublePrecision("max_draft_m").notNull(),
    timezone: text("timezone").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("maritime_ports_workspace_idx").on(table.workspaceId)],
);

export const maritimePeople = pgTable(
  "maritime_people",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role").notNull(),
    department: text("department").notNull(),
    location: text("location").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_people_workspace_idx").on(table.workspaceId),
    uniqueIndex("maritime_people_workspace_email_idx").on(table.workspaceId, table.email),
  ],
);

export const maritimeVoyages = pgTable(
  "maritime_voyages",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    vesselId: text("vessel_id").notNull(),
    vesselName: text("vessel_name").notNull(),
    imo: text("imo").notNull(),
    originPortId: text("origin_port_id").notNull(),
    originPort: text("origin_port").notNull(),
    destinationPortId: text("destination_port_id").notNull(),
    destinationPort: text("destination_port").notNull(),
    cargo: text("cargo").notNull(),
    laycanStart: text("laycan_start").notNull(),
    laycanEnd: text("laycan_end").notNull(),
    etd: text("etd").notNull(),
    eta: text("eta").notNull(),
    status: text("status").notNull(),
    operationsContactId: text("operations_contact_id").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_voyages_workspace_idx").on(table.workspaceId),
    index("maritime_voyages_vessel_idx").on(table.workspaceId, table.vesselId),
    index("maritime_voyages_status_idx").on(table.workspaceId, table.status),
  ],
);

export const maritimeEmails = pgTable(
  "maritime_emails",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    threadId: text("thread_id").notNull(),
    subject: text("subject").notNull(),
    from: text("from_address").notNull(),
    to: jsonb("to_addresses").$type<string[]>().notNull().default([]),
    cc: jsonb("cc_addresses").$type<string[]>().notNull().default([]),
    sentAt: text("sent_at").notNull(),
    body: text("body").notNull(),
    relatedVoyageId: text("related_voyage_id").notNull(),
    relatedVesselName: text("related_vessel_name").notNull(),
    attachments: jsonb("attachments").$type<Record<string, unknown>[]>().notNull().default([]),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_emails_workspace_idx").on(table.workspaceId),
    index("maritime_emails_thread_idx").on(table.workspaceId, table.threadId),
    index("maritime_emails_voyage_idx").on(table.workspaceId, table.relatedVoyageId),
  ],
);

export const maritimeEmailChunks = pgTable(
  "maritime_email_chunks",
  {
    id: text("id").primaryKey(),
    emailId: text("email_id")
      .notNull()
      .references(() => maritimeEmails.id, { onDelete: "cascade" }),
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
    index("maritime_email_chunks_email_idx").on(table.emailId),
    index("maritime_email_chunks_workspace_idx").on(table.workspaceId),
    index("maritime_email_chunks_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  ],
);

export const maritimeEmbeddingChunks = pgTable(
  "maritime_embedding_chunks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    chunkIndex: integer("chunk_index").notNull(),
    content: text("content").notNull(),
    tokenEstimate: integer("token_estimate").notNull(),
    embedding: vector("embedding", { dimensions: EMBEDDING_DIMENSIONS }),
    relatedVoyageId: text("related_voyage_id"),
    relatedVesselName: text("related_vessel_name"),
    recordType: text("record_type"),
    entityName: text("entity_name"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_embedding_chunks_workspace_idx").on(table.workspaceId),
    index("maritime_embedding_chunks_source_idx").on(table.workspaceId, table.sourceType, table.sourceId),
    index("maritime_embedding_chunks_voyage_idx").on(table.workspaceId, table.relatedVoyageId),
    index("maritime_embedding_chunks_record_type_idx").on(table.workspaceId, table.recordType),
    index("maritime_embedding_chunks_embedding_idx")
      .using("hnsw", table.embedding.op("vector_cosine_ops"))
      .with({ m: 16, ef_construction: 64 }),
  ],
);

export const maritimeDocuments = pgTable(
  "maritime_documents",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    documentId: text("document_id").notNull().references(() => documents.id, { onDelete: "cascade" }),
    fileName: text("file_name").notNull(),
    path: text("path").notNull(),
    documentType: text("document_type").notNull(),
    relatedVoyageId: text("related_voyage_id").notNull(),
    relatedVesselName: text("related_vessel_name").notNull(),
    sourceEmailId: text("source_email_id").notNull(),
    sourceAttachmentId: text("source_attachment_id").notNull(),
    originalAttachmentFilename: text("original_attachment_filename").notNull(),
    sourceCreatedAt: text("source_created_at").notNull(),
    frontMatter: jsonb("front_matter").$type<Record<string, unknown>>().notNull().default({}),
    content: text("content").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_documents_workspace_idx").on(table.workspaceId),
    index("maritime_documents_voyage_idx").on(table.workspaceId, table.relatedVoyageId),
    index("maritime_documents_type_idx").on(table.workspaceId, table.documentType),
    uniqueIndex("maritime_documents_workspace_doc_idx").on(table.workspaceId, table.documentId),
  ],
);

export const maritimeBunkerReports = pgTable(
  "maritime_bunker_reports",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    vessel: text("vessel").notNull(),
    voyageId: text("voyage_id").notNull(),
    fuelType: text("fuel_type").notNull(),
    quantityMt: doublePrecision("quantity_mt").notNull(),
    sulfurPct: doublePrecision("sulfur_pct").notNull(),
    co2Factor: doublePrecision("co2_factor").notNull(),
    port: text("port").notNull(),
    supplier: text("supplier").notNull(),
    invoiceDate: text("invoice_date").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_bunker_reports_workspace_idx").on(table.workspaceId),
    index("maritime_bunker_reports_voyage_idx").on(table.workspaceId, table.voyageId),
  ],
);

export const maritimeAisPositions = pgTable(
  "maritime_ais_positions",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    voyageId: text("voyage_id").notNull(),
    vesselName: text("vessel_name").notNull(),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    speedKnots: doublePrecision("speed_knots").notNull(),
    heading: integer("heading").notNull(),
    positionTimestamp: text("position_timestamp").notNull(),
    destination: text("destination").notNull(),
    eta: text("eta").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_ais_positions_workspace_idx").on(table.workspaceId),
    index("maritime_ais_positions_voyage_idx").on(table.workspaceId, table.voyageId),
  ],
);

export const maritimeVoyageEvents = pgTable(
  "maritime_voyage_events",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    voyageId: text("voyage_id").notNull(),
    vesselName: text("vessel_name").notNull(),
    eventType: text("event_type").notNull(),
    eventTime: text("event_time").notNull(),
    location: text("location").notNull(),
    severity: text("severity").notNull(),
    description: text("description").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_voyage_events_workspace_idx").on(table.workspaceId),
    index("maritime_voyage_events_voyage_idx").on(table.workspaceId, table.voyageId),
    index("maritime_voyage_events_type_idx").on(table.workspaceId, table.eventType),
  ],
);

export const maritimeComplianceFlags = pgTable(
  "maritime_compliance_flags",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    voyageId: text("voyage_id").notNull(),
    vesselName: text("vessel_name").notNull(),
    euEtsExposure: boolean("eu_ets_exposure").notNull(),
    fueleuRisk: boolean("fueleu_risk").notNull(),
    mrvMissingData: boolean("mrv_missing_data").notNull(),
    ciiRisk: boolean("cii_risk").notNull(),
    riskScore: integer("risk_score").notNull(),
    riskLevel: text("risk_level").notNull(),
    rationale: jsonb("rationale").$type<string[]>().notNull().default([]),
    lastEvaluatedAt: text("last_evaluated_at").notNull(),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_compliance_flags_workspace_idx").on(table.workspaceId),
    index("maritime_compliance_flags_voyage_idx").on(table.workspaceId, table.voyageId),
    index("maritime_compliance_flags_risk_idx").on(table.workspaceId, table.riskLevel),
  ],
);

export const maritimeScenarios = pgTable(
  "maritime_scenarios",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    primaryVoyageId: text("primary_voyage_id").notNull(),
    primaryVesselName: text("primary_vessel_name").notNull(),
    severity: text("severity").notNull(),
    status: text("status").notNull(),
    businessProblem: text("business_problem").notNull(),
    narrative: text("narrative").notNull(),
    recommendedDemoQuestions: jsonb("recommended_demo_questions").$type<string[]>().notNull().default([]),
    expectedInsights: jsonb("expected_insights").$type<string[]>().notNull().default([]),
    evidence: jsonb("evidence").$type<Record<string, unknown>>().notNull().default({}),
    suggestedActions: jsonb("suggested_actions").$type<string[]>().notNull().default([]),
    raw: rawMetadata(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("maritime_scenarios_workspace_idx").on(table.workspaceId),
    index("maritime_scenarios_voyage_idx").on(table.workspaceId, table.primaryVoyageId),
    index("maritime_scenarios_status_idx").on(table.workspaceId, table.status),
  ],
);

export const workspaceRelations = relations(workspaces, ({ many }) => ({
  members: many(workspaceMembers),
  documents: many(documents),
  maritimeVessels: many(maritimeVessels),
  maritimeVoyages: many(maritimeVoyages),
  maritimeEmails: many(maritimeEmails),
}));

export const documentRelations = relations(documents, ({ many }) => ({
  chunks: many(documentChunks),
}));

export const chatThreadRelations = relations(chatThreads, ({ many }) => ({
  messages: many(chatMessages),
}));

export const maritimeEmailRelations = relations(maritimeEmails, ({ many }) => ({
  chunks: many(maritimeEmailChunks),
}));

export const vectorExtensionSql = sql`CREATE EXTENSION IF NOT EXISTS vector`;
