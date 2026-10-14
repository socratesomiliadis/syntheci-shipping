# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

![Syntheci Shipping banner](assets/syntheci-readme-hero-banner.png)

Maritimer Operations-Arbeitsbereich für Reedereiteams. Syntheci erfasst Reise- und Betriebsdokumente, macht sie über KI-gestützte Suche mit Quellenangaben durchsuchbar, verfolgt Reiserisiken und führt Workflow-Automatisierungen für fehlende Dokumente, Watchlists, Claims-Pakete, PDA/FDA-Prüfungen und Zahlungsrisiken aus.

## Hackathon

Entwickelt für den Florent Venture Partners Hackathon im Panathēnea in Athen; aus über 100 Bewerbern als eines von 25 zugelassenen Teams ausgewählt und bis in die Finalrunde der besten 3 vorgerückt.

## Stack

- **Web:** Next.js App Router, React, Tailwind CSS
- **Authentifizierung:** Better Auth
- **Jobs:** BullMQ, Redis
- **Datenbank:** Postgres 16, pgvector, Drizzle ORM
- **Speicher:** MinIO / S3-kompatibler Speicher
- **KI:** Google Embeddings und Groq Chat über das Vercel AI SDK
- **Tooling:** pnpm workspaces, TypeScript, Vitest

## Repository-Struktur

```text
apps/
  web/          Next.js-App, API-Routen, Workspace-UI
  worker/       BullMQ-Prozessoren für Erfassung und Automatisierung

packages/
  ai/           Modell-Wrapper, Chunking, Zitate, Extraktionshelfer
  db/           Schema, Migrationen, Retrieval, Seed-Helfer
  shared/       Env, Queue-Verträge, Validierung, Workflow-Logik

demo-data/      synthetischer Maritim-Datensatz für Aegean Meridian Shipping
```

## Einrichtung

Voraussetzungen:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Umgebungsdatei erstellen:

```bash
cp .env.example .env
```

Standardmäßige lokale Dienste:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Optionale KI-Schlüssel:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Lokal ausführen:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Öffne `http://localhost:3000`.

## Demodaten

`demo-data/` enthält einen synthetischen Maritim-Datensatz zum Testen von Erfassung, Suche, Reiseansichten und Automatisierungen.

## Befehle

```bash
pnpm dev             # Web und Worker ausführen
pnpm build           # Pakete bauen
pnpm test            # Tests ausführen
pnpm db:migrate      # Migrationen anwenden
pnpm docker:infra    # Postgres, Redis, MinIO und Worker starten
pnpm docker:down     # Docker-Dienste stoppen
```

## Autoren

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
