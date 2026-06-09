# Syntheci Shipping

Maritime operations workspace for shipping teams. Syntheci ingests voyage and operational documents, makes them searchable with cited AI retrieval, tracks voyage risk, and runs workflow automations for missing documents, watchlists, claims packs, PDA/FDA checks, and payment risk.

## Hackathon

Built for the Florent Venture Partners Hackathon at Panathēnea in Athens, selected from 100+ applicants as one of 25 teams admitted. Advanced to the top 3 finalist stage.

## Stack

- **Web:** Next.js App Router, React, Tailwind CSS
- **Auth:** Better Auth
- **Jobs:** BullMQ, Redis
- **Database:** Postgres 16, pgvector, Drizzle ORM
- **Storage:** MinIO / S3-compatible storage
- **AI:** Google embeddings and Groq chat through the Vercel AI SDK
- **Tooling:** pnpm workspaces, TypeScript, Vitest

## Repository Layout

```text
apps/
  web/          Next.js app, API routes, workspace UI
  worker/       BullMQ ingestion and automation processors

packages/
  ai/           model wrappers, chunking, citations, extraction helpers
  db/           schema, migrations, retrieval, seed helpers
  shared/       env, queue contracts, validation, workflow logic

demo-data/      synthetic maritime dataset for Aegean Meridian Shipping
```

## Setup

Requirements:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Create an environment file:

```bash
cp .env.example .env
```

Default local services:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Optional AI keys:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Run locally:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000`.

## Demo Data

`demo-data/` contains a synthetic maritime dataset for testing ingestion, search, voyage views, and automations.

## Commands

```bash
pnpm dev             # Run web and worker
pnpm build           # Build packages
pnpm test            # Run tests
pnpm db:migrate      # Apply migrations
pnpm docker:infra    # Start Postgres, Redis, MinIO, and worker
pnpm docker:down     # Stop Docker services
```

## Authors

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
