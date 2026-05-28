CREATE TABLE "maritime_ais_positions" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"lat" double precision NOT NULL,
	"lng" double precision NOT NULL,
	"speed_knots" double precision NOT NULL,
	"heading" integer NOT NULL,
	"position_timestamp" text NOT NULL,
	"destination" text NOT NULL,
	"eta" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_bunker_reports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"vessel" text NOT NULL,
	"voyage_id" text NOT NULL,
	"fuel_type" text NOT NULL,
	"quantity_mt" double precision NOT NULL,
	"sulfur_pct" double precision NOT NULL,
	"co2_factor" double precision NOT NULL,
	"port" text NOT NULL,
	"supplier" text NOT NULL,
	"invoice_date" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_compliance_flags" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"eu_ets_exposure" boolean NOT NULL,
	"fueleu_risk" boolean NOT NULL,
	"mrv_missing_data" boolean NOT NULL,
	"cii_risk" boolean NOT NULL,
	"risk_score" integer NOT NULL,
	"risk_level" text NOT NULL,
	"rationale" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_evaluated_at" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"document_id" text NOT NULL,
	"file_name" text NOT NULL,
	"path" text NOT NULL,
	"document_type" text NOT NULL,
	"related_voyage_id" text NOT NULL,
	"related_vessel_name" text NOT NULL,
	"source_email_id" text NOT NULL,
	"source_attachment_id" text NOT NULL,
	"original_attachment_filename" text NOT NULL,
	"source_created_at" text NOT NULL,
	"front_matter" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"content" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_emails" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"thread_id" text NOT NULL,
	"subject" text NOT NULL,
	"from_address" text NOT NULL,
	"to_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"cc_addresses" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"sent_at" text NOT NULL,
	"body" text NOT NULL,
	"related_voyage_id" text NOT NULL,
	"related_vessel_name" text NOT NULL,
	"attachments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_people" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"department" text NOT NULL,
	"location" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_ports" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"port_name" text NOT NULL,
	"country" text NOT NULL,
	"region" text NOT NULL,
	"port_type" text NOT NULL,
	"berths" integer NOT NULL,
	"max_draft_m" double precision NOT NULL,
	"timezone" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_scenarios" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"title" text NOT NULL,
	"primary_voyage_id" text NOT NULL,
	"primary_vessel_name" text NOT NULL,
	"severity" text NOT NULL,
	"status" text NOT NULL,
	"business_problem" text NOT NULL,
	"narrative" text NOT NULL,
	"recommended_demo_questions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_insights" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evidence" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"suggested_actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_vessels" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"imo" text NOT NULL,
	"vessel_type" text NOT NULL,
	"dwt" integer NOT NULL,
	"flag" text NOT NULL,
	"year_built" integer NOT NULL,
	"capacity" text NOT NULL,
	"home_port" text NOT NULL,
	"operational_status" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_voyage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"event_type" text NOT NULL,
	"event_time" text NOT NULL,
	"location" text NOT NULL,
	"severity" text NOT NULL,
	"description" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "maritime_voyages" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"vessel_id" text NOT NULL,
	"vessel_name" text NOT NULL,
	"imo" text NOT NULL,
	"origin_port_id" text NOT NULL,
	"origin_port" text NOT NULL,
	"destination_port_id" text NOT NULL,
	"destination_port" text NOT NULL,
	"cargo" text NOT NULL,
	"laycan_start" text NOT NULL,
	"laycan_end" text NOT NULL,
	"etd" text NOT NULL,
	"eta" text NOT NULL,
	"status" text NOT NULL,
	"operations_contact_id" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maritime_ais_positions" ADD CONSTRAINT "maritime_ais_positions_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_bunker_reports" ADD CONSTRAINT "maritime_bunker_reports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_compliance_flags" ADD CONSTRAINT "maritime_compliance_flags_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_documents" ADD CONSTRAINT "maritime_documents_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_documents" ADD CONSTRAINT "maritime_documents_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_emails" ADD CONSTRAINT "maritime_emails_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_people" ADD CONSTRAINT "maritime_people_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_ports" ADD CONSTRAINT "maritime_ports_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_scenarios" ADD CONSTRAINT "maritime_scenarios_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_vessels" ADD CONSTRAINT "maritime_vessels_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_voyage_events" ADD CONSTRAINT "maritime_voyage_events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_voyages" ADD CONSTRAINT "maritime_voyages_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maritime_ais_positions_workspace_idx" ON "maritime_ais_positions" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_ais_positions_voyage_idx" ON "maritime_ais_positions" USING btree ("workspace_id","voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_bunker_reports_workspace_idx" ON "maritime_bunker_reports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_bunker_reports_voyage_idx" ON "maritime_bunker_reports" USING btree ("workspace_id","voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_compliance_flags_workspace_idx" ON "maritime_compliance_flags" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_compliance_flags_voyage_idx" ON "maritime_compliance_flags" USING btree ("workspace_id","voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_compliance_flags_risk_idx" ON "maritime_compliance_flags" USING btree ("workspace_id","risk_level");--> statement-breakpoint
CREATE INDEX "maritime_documents_workspace_idx" ON "maritime_documents" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_documents_voyage_idx" ON "maritime_documents" USING btree ("workspace_id","related_voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_documents_type_idx" ON "maritime_documents" USING btree ("workspace_id","document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_documents_workspace_doc_idx" ON "maritime_documents" USING btree ("workspace_id","document_id");--> statement-breakpoint
CREATE INDEX "maritime_emails_workspace_idx" ON "maritime_emails" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_emails_thread_idx" ON "maritime_emails" USING btree ("workspace_id","thread_id");--> statement-breakpoint
CREATE INDEX "maritime_emails_voyage_idx" ON "maritime_emails" USING btree ("workspace_id","related_voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_people_workspace_idx" ON "maritime_people" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_people_workspace_email_idx" ON "maritime_people" USING btree ("workspace_id","email");--> statement-breakpoint
CREATE INDEX "maritime_ports_workspace_idx" ON "maritime_ports" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_scenarios_workspace_idx" ON "maritime_scenarios" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_scenarios_voyage_idx" ON "maritime_scenarios" USING btree ("workspace_id","primary_voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_scenarios_status_idx" ON "maritime_scenarios" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "maritime_vessels_workspace_idx" ON "maritime_vessels" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "maritime_vessels_workspace_imo_idx" ON "maritime_vessels" USING btree ("workspace_id","imo");--> statement-breakpoint
CREATE INDEX "maritime_voyage_events_workspace_idx" ON "maritime_voyage_events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_voyage_events_voyage_idx" ON "maritime_voyage_events" USING btree ("workspace_id","voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_voyage_events_type_idx" ON "maritime_voyage_events" USING btree ("workspace_id","event_type");--> statement-breakpoint
CREATE INDEX "maritime_voyages_workspace_idx" ON "maritime_voyages" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_voyages_vessel_idx" ON "maritime_voyages" USING btree ("workspace_id","vessel_id");--> statement-breakpoint
CREATE INDEX "maritime_voyages_status_idx" ON "maritime_voyages" USING btree ("workspace_id","status");