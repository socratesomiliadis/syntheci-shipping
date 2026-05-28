# Syntheci Maritime AI

Hackathon MVP scaffold for a maritime RAG and automations platform. The repo is a `pnpm` workspace with a Next.js app, a BullMQ worker, shared AI/database packages, Docker Compose services, Postgres + pgvector, Redis, and MinIO.

## Layout

- `apps/web` - Next.js App Router, shadcn-style components, Better Auth, upload/chat/automation UI, and API routes.
- `apps/worker` - BullMQ processors for ingestion and automation runs.
- `packages/db` - Drizzle schema, database client, retrieval helpers, and migrations.
- `packages/ai` - AI SDK model wrappers, chunking, citation formatting, and maritime prompts.
- `packages/shared` - environment parsing, queue contracts, validation schemas, roles, and demo workflows.

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:generate
pnpm db:migrate
```

This workspace follows the local instruction not to start a dev server automatically. Start processes only when you explicitly want them:

```bash
pnpm dev
pnpm worker:dev
```

## Docker

```bash
docker compose up --build
```

To run the backing services and worker through Compose while keeping the Next.js app local for HMR:

```bash
pnpm docker:infra
pnpm db:migrate
pnpm --filter @syntheci/web dev
```

Services:

- Web app: `http://localhost:3000`
- Postgres: `localhost:5432`
- Redis: `localhost:6379`
- MinIO API: `http://localhost:9000`
- MinIO console: `http://localhost:9001`

## MVP Flow

1. Create or sign in with an email/password account at `/login`.
2. Upload `.txt`, `.md`, `.csv`, `.json`, or `.log` files in `/workspace/sources`.
3. The web app creates a MinIO upload URL and enqueues an ingestion job.
4. The worker chunks text, embeds it, and stores vectors in `document_chunks`.
5. Ask cited questions in `/workspace/chat`.
6. Create and run maritime automations in `/workspace/automations`.

Set `GOOGLE_GENERATIVE_AI_API_KEY` for Google embeddings and `GROQ_API_KEY` for Groq chat/agentic work with `qwen/qwen3-32b`. Without those keys, the scaffold uses deterministic local embeddings and placeholder briefs so the queue and UI flows can still be exercised.
