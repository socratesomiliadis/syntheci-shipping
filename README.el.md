# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

Χώρος εργασίας ναυτιλιακών λειτουργιών για ναυτιλιακές ομάδες. Το Syntheci εισάγει έγγραφα ταξιδιών και λειτουργιών, τα καθιστά αναζητήσιμα μέσω ανάκτησης με AI και παραπομπές, παρακολουθεί τον κίνδυνο των ταξιδιών και εκτελεί αυτοματισμούς ροής εργασιών για ελλείποντα έγγραφα, λίστες παρακολούθησης, φακέλους απαιτήσεων (claims), ελέγχους PDA/FDA και κίνδυνο πληρωμών.

## Hackathon

<p align="center">
  <img src="assets/syntheci-readme-hero-banner.png" alt="Syntheci — Florent × Panathēnea Hackathon" width="100%">
</p>

Δημιουργήθηκε για το Florent Venture Partners Hackathon στο Panathēnea στην Αθήνα· επιλέχθηκε μεταξύ 100+ υποψηφίων ως μία από τις 25 ομάδες που έγιναν δεκτές και προκρίθηκε στους 3 τελικούς.

## Stack

- **Web:** Next.js App Router, React, Tailwind CSS
- **Auth:** Better Auth
- **Jobs:** BullMQ, Redis
- **Βάση δεδομένων:** Postgres 16, pgvector, Drizzle ORM
- **Αποθήκευση:** MinIO / αποθήκευση συμβατή με S3
- **AI:** Google embeddings και Groq chat μέσω του Vercel AI SDK
- **Εργαλεία:** pnpm workspaces, TypeScript, Vitest

## Δομή αποθετηρίου

```text
apps/
  web/          Next.js εφαρμογή, API routes, UI χώρου εργασίας
  worker/       επεξεργαστές εισαγωγής και αυτοματισμών BullMQ

packages/
  ai/           wrappers μοντέλων, chunking, παραπομπές, βοηθητικά εξαγωγής
  db/           schema, migrations, ανάκτηση, βοηθητικά seed
  shared/       env, συμβόλαια ουρών, επικύρωση, λογική ροών εργασιών

demo-data/      συνθετικό ναυτιλιακό σύνολο δεδομένων για την Aegean Meridian Shipping
```

## Εγκατάσταση

Προαπαιτούμενα:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Δημιουργήστε ένα αρχείο περιβάλλοντος:

```bash
cp .env.example .env
```

Προεπιλεγμένες τοπικές υπηρεσίες:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Προαιρετικά κλειδιά AI:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Εκτέλεση τοπικά:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Ανοίξτε το `http://localhost:3000`.

## Δεδομένα επίδειξης

Το `demo-data/` περιέχει ένα συνθετικό ναυτιλιακό σύνολο δεδομένων για δοκιμές εισαγωγής, αναζήτησης, προβολών ταξιδιών και αυτοματισμών.

## Εντολές

```bash
pnpm dev             # Εκτέλεση web και worker
pnpm build           # Build των πακέτων
pnpm test            # Εκτέλεση δοκιμών
pnpm db:migrate      # Εφαρμογή migrations
pnpm docker:infra    # Εκκίνηση Postgres, Redis, MinIO και worker
pnpm docker:down     # Διακοπή υπηρεσιών Docker
```

## Δημιουργοί

- [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/)
- [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
