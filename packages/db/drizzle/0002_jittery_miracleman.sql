CREATE TABLE "maritime_email_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"email_id" text NOT NULL,
	"workspace_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_estimate" integer NOT NULL,
	"embedding" vector(1536),
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maritime_email_chunks" ADD CONSTRAINT "maritime_email_chunks_email_id_maritime_emails_id_fk" FOREIGN KEY ("email_id") REFERENCES "public"."maritime_emails"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "maritime_email_chunks" ADD CONSTRAINT "maritime_email_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maritime_email_chunks_email_idx" ON "maritime_email_chunks" USING btree ("email_id");--> statement-breakpoint
CREATE INDEX "maritime_email_chunks_workspace_idx" ON "maritime_email_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_email_chunks_embedding_idx" ON "maritime_email_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);