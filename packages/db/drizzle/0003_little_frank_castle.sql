CREATE TABLE "maritime_embedding_chunks" (
	"id" text PRIMARY KEY NOT NULL,
	"workspace_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"chunk_index" integer NOT NULL,
	"content" text NOT NULL,
	"token_estimate" integer NOT NULL,
	"embedding" vector(1536),
	"related_voyage_id" text,
	"related_vessel_name" text,
	"record_type" text,
	"entity_name" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "maritime_embedding_chunks" ADD CONSTRAINT "maritime_embedding_chunks_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "maritime_embedding_chunks_workspace_idx" ON "maritime_embedding_chunks" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "maritime_embedding_chunks_source_idx" ON "maritime_embedding_chunks" USING btree ("workspace_id","source_type","source_id");--> statement-breakpoint
CREATE INDEX "maritime_embedding_chunks_voyage_idx" ON "maritime_embedding_chunks" USING btree ("workspace_id","related_voyage_id");--> statement-breakpoint
CREATE INDEX "maritime_embedding_chunks_record_type_idx" ON "maritime_embedding_chunks" USING btree ("workspace_id","record_type");--> statement-breakpoint
CREATE INDEX "maritime_embedding_chunks_embedding_idx" ON "maritime_embedding_chunks" USING hnsw ("embedding" vector_cosine_ops) WITH (m=16,ef_construction=64);