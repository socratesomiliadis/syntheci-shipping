# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

Espace de travail d'opérations maritimes pour les équipes d'armement. Syntheci ingère les documents de voyage et d'exploitation, les rend consultables grâce à une recherche IA avec citations, suit le risque des voyages et exécute des automatisations de flux de travail pour les documents manquants, les listes de surveillance, les dossiers de réclamations, les contrôles PDA/FDA et le risque de paiement.

## Hackathon

<p align="center">
  <img src="assets/syntheci-readme-hero-banner.png" alt="Syntheci — Florent × Panathēnea Hackathon" width="100%">
</p>

Conçu pour le Florent Venture Partners Hackathon au Panathēnea, à Athènes ; sélectionné parmi plus de 100 candidatures comme l'une des 25 équipes admises, puis qualifié pour la finale des 3 meilleures équipes.

## Stack

- **Web :** Next.js App Router, React, Tailwind CSS
- **Authentification :** Better Auth
- **Tâches :** BullMQ, Redis
- **Base de données :** Postgres 16, pgvector, Drizzle ORM
- **Stockage :** MinIO / stockage compatible S3
- **IA :** embeddings Google et chat Groq via le Vercel AI SDK
- **Outillage :** pnpm workspaces, TypeScript, Vitest

## Structure du dépôt

```text
apps/
  web/          application Next.js, routes d'API, interface de l'espace de travail
  worker/       processeurs BullMQ d'ingestion et d'automatisation

packages/
  ai/           wrappers de modèles, découpage, citations, utilitaires d'extraction
  db/           schéma, migrations, recherche, utilitaires de seed
  shared/       env, contrats de file, validation, logique de flux de travail

demo-data/      jeu de données maritime synthétique pour Aegean Meridian Shipping
```

## Installation

Prérequis :

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Créez un fichier d'environnement :

```bash
cp .env.example .env
```

Services locaux par défaut :

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Clés IA facultatives :

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Exécuter en local :

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Ouvrez `http://localhost:3000`.

## Données de démonstration

`demo-data/` contient un jeu de données maritime synthétique pour tester l'ingestion, la recherche, les vues de voyage et les automatisations.

## Commandes

```bash
pnpm dev             # Lancer le web et le worker
pnpm build           # Construire les packages
pnpm test            # Lancer les tests
pnpm db:migrate      # Appliquer les migrations
pnpm docker:infra    # Démarrer Postgres, Redis, MinIO et le worker
pnpm docker:down     # Arrêter les services Docker
```

## Contact

Questions, demandes de partenariat ou retours sur ce projet :

- LinkedIn: [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/) | [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@socratesom](https://x.com/socratesom) | [@aevagnarly](https://x.com/aevagnarly)
