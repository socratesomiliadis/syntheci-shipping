CREATE TABLE "external_import_batches" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"provider" text NOT NULL,
	"source_type" text NOT NULL,
	"status" text DEFAULT 'completed' NOT NULL,
	"summary" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_document_extractions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"document_type" text NOT NULL,
	"fields" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"confidence" double precision NOT NULL,
	"status" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_reconciliation_findings" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"finding_type" text NOT NULL,
	"severity" text NOT NULL,
	"confidence" double precision NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"suggested_action" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_voyage_snapshots" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"state_hash" text NOT NULL,
	"state" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "external_import_batches" ADD CONSTRAINT "external_import_batches_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "maritime_document_extractions" ADD CONSTRAINT "maritime_document_extractions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "maritime_reconciliation_findings" ADD CONSTRAINT "maritime_reconciliation_findings_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "maritime_voyage_snapshots" ADD CONSTRAINT "maritime_voyage_snapshots_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "external_import_batches_workspace_idx" ON "external_import_batches" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "external_import_batches_source_idx" ON "external_import_batches" USING btree ("workspace_id","source_type");
--> statement-breakpoint
CREATE INDEX "maritime_document_extractions_workspace_idx" ON "maritime_document_extractions" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "maritime_document_extractions_voyage_idx" ON "maritime_document_extractions" USING btree ("workspace_id","voyage_id");
--> statement-breakpoint
CREATE INDEX "maritime_document_extractions_document_idx" ON "maritime_document_extractions" USING btree ("workspace_id","document_id");
--> statement-breakpoint
CREATE INDEX "maritime_document_extractions_status_idx" ON "maritime_document_extractions" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_document_extractions_workspace_document_idx" ON "maritime_document_extractions" USING btree ("workspace_id","document_id");
--> statement-breakpoint
CREATE INDEX "maritime_reconciliation_findings_workspace_idx" ON "maritime_reconciliation_findings" USING btree ("workspace_id");
--> statement-breakpoint
CREATE INDEX "maritime_reconciliation_findings_voyage_idx" ON "maritime_reconciliation_findings" USING btree ("workspace_id","voyage_id");
--> statement-breakpoint
CREATE INDEX "maritime_reconciliation_findings_type_idx" ON "maritime_reconciliation_findings" USING btree ("workspace_id","finding_type");
--> statement-breakpoint
CREATE INDEX "maritime_reconciliation_findings_status_idx" ON "maritime_reconciliation_findings" USING btree ("workspace_id","status");
--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_reconciliation_findings_unique_idx" ON "maritime_reconciliation_findings" USING btree ("workspace_id","voyage_id","finding_type","title");
--> statement-breakpoint
CREATE INDEX "maritime_voyage_snapshots_workspace_idx" ON "maritime_voyage_snapshots" USING btree ("workspace_id");
--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_voyage_snapshots_workspace_voyage_idx" ON "maritime_voyage_snapshots" USING btree ("workspace_id","voyage_id");
