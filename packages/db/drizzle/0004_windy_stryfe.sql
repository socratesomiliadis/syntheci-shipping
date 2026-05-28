CREATE TYPE "public"."chat_feedback_rating" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."operational_job_priority" AS ENUM('low', 'medium', 'high');--> statement-breakpoint
CREATE TYPE "public"."operational_job_status" AS ENUM('open', 'in_progress', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TABLE "chat_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"message_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"rating" "chat_feedback_rating" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operational_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"voyage_id" text NOT NULL,
	"job_type" text NOT NULL,
	"status" "operational_job_status" DEFAULT 'open' NOT NULL,
	"priority" "operational_job_priority" DEFAULT 'medium' NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"evidence" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chat_feedback" ADD CONSTRAINT "chat_feedback_message_id_chat_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."chat_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "chat_feedback" ADD CONSTRAINT "chat_feedback_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "operational_jobs" ADD CONSTRAINT "operational_jobs_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "chat_feedback_workspace_idx" ON "chat_feedback" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "chat_feedback_message_idx" ON "chat_feedback" USING btree ("message_id");--> statement-breakpoint
CREATE UNIQUE INDEX "chat_feedback_message_workspace_idx" ON "chat_feedback" USING btree ("message_id","workspace_id");--> statement-breakpoint
CREATE INDEX "operational_jobs_workspace_idx" ON "operational_jobs" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "operational_jobs_voyage_idx" ON "operational_jobs" USING btree ("workspace_id","voyage_id");--> statement-breakpoint
CREATE INDEX "operational_jobs_status_idx" ON "operational_jobs" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "operational_jobs_type_idx" ON "operational_jobs" USING btree ("workspace_id","job_type");