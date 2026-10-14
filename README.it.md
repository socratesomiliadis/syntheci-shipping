# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

Spazio di lavoro per le operazioni marittime destinato ai team di shipping. Syntheci acquisisce documenti di viaggio e operativi, li rende ricercabili con un retrieval AI che cita le fonti, monitora il rischio dei viaggi ed esegue automazioni di workflow per documenti mancanti, watchlist, pacchetti di claim, controlli PDA/FDA e rischio di pagamento.

## Hackathon

<p align="center">
  <img src="assets/syntheci-readme-hero-banner.png" alt="Syntheci — Florent × Panathēnea Hackathon" width="100%">
</p>

Realizzato per il Florent Venture Partners Hackathon al Panathēnea di Atene; selezionato tra oltre 100 candidati come uno dei 25 team ammessi e arrivato alla fase finale dei primi 3.

## Stack

- **Web:** Next.js App Router, React, Tailwind CSS
- **Autenticazione:** Better Auth
- **Job:** BullMQ, Redis
- **Database:** Postgres 16, pgvector, Drizzle ORM
- **Storage:** MinIO / storage compatibile S3
- **AI:** embedding Google e chat Groq tramite il Vercel AI SDK
- **Tooling:** pnpm workspaces, TypeScript, Vitest

## Struttura del repository

```text
apps/
  web/          app Next.js, route API, UI dello spazio di lavoro
  worker/       processori BullMQ di acquisizione e automazione

packages/
  ai/           wrapper dei modelli, chunking, citazioni, helper di estrazione
  db/           schema, migrazioni, retrieval, helper di seed
  shared/       env, contratti delle code, validazione, logica dei workflow

demo-data/      dataset marittimo sintetico per Aegean Meridian Shipping
```

## Configurazione

Requisiti:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Crea un file di ambiente:

```bash
cp .env.example .env
```

Servizi locali predefiniti:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Chiavi AI opzionali:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Esegui in locale:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Apri `http://localhost:3000`.

## Dati demo

`demo-data/` contiene un dataset marittimo sintetico per testare acquisizione, ricerca, viste dei viaggi e automazioni.

## Comandi

```bash
pnpm dev             # Esegui web e worker
pnpm build           # Compila i pacchetti
pnpm test            # Esegui i test
pnpm db:migrate      # Applica le migrazioni
pnpm docker:infra    # Avvia Postgres, Redis, MinIO e il worker
pnpm docker:down     # Arresta i servizi Docker
```

## Autori

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
