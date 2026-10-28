# Syntheci Shipping

[English](README.md) | [Ελληνικά](README.el.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Italiano](README.it.md) | [Español](README.es.md)

Espacio de trabajo de operaciones marítimas para equipos de transporte marítimo. Syntheci ingiere documentos de viaje y operativos, los hace consultables con una recuperación mediante IA con citas, rastrea el riesgo de los viajes y ejecuta automatizaciones de flujos de trabajo para documentos faltantes, listas de vigilancia, paquetes de reclamaciones, verificaciones PDA/FDA y riesgo de pago.

## Hackathon

<p align="center">
  <img src="assets/syntheci-readme-hero-banner.png" alt="Syntheci — Florent × Panathēnea Hackathon" width="100%">
</p>

Creado para el Florent Venture Partners Hackathon en el Panathēnea de Atenas; seleccionado entre más de 100 solicitantes como uno de los 25 equipos admitidos y clasificado a la fase final de los 3 mejores.

## Stack

- **Web:** Next.js App Router, React, Tailwind CSS
- **Autenticación:** Better Auth
- **Trabajos:** BullMQ, Redis
- **Base de datos:** Postgres 16, pgvector, Drizzle ORM
- **Almacenamiento:** MinIO / almacenamiento compatible con S3
- **IA:** embeddings de Google y chat de Groq mediante el Vercel AI SDK
- **Herramientas:** pnpm workspaces, TypeScript, Vitest

## Estructura del repositorio

```text
apps/
  web/          aplicación Next.js, rutas de API, interfaz del espacio de trabajo
  worker/       procesadores BullMQ de ingesta y automatización

packages/
  ai/           wrappers de modelos, chunking, citas, utilidades de extracción
  db/           esquema, migraciones, recuperación, utilidades de seed
  shared/       env, contratos de colas, validación, lógica de flujos de trabajo

demo-data/      conjunto de datos marítimos sintético para Aegean Meridian Shipping
```

## Configuración

Requisitos:

- Node.js 20+
- pnpm 10.33.4+
- Docker Desktop

Crea un archivo de entorno:

```bash
cp .env.example .env
```

Servicios locales por defecto:

```text
DATABASE_URL=postgres://syntheci:syntheci@localhost:5432/syntheci
REDIS_URL=redis://localhost:6379
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=sources
BETTER_AUTH_URL=http://localhost:3000
```

Claves de IA opcionales:

```text
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
```

Ejecuta en local:

```bash
pnpm install
pnpm docker:infra
pnpm db:migrate
pnpm dev
```

Abre `http://localhost:3000`.

## Datos de demostración

`demo-data/` contiene un conjunto de datos marítimos sintético para probar la ingesta, la búsqueda, las vistas de viaje y las automatizaciones.

## Comandos

```bash
pnpm dev             # Ejecutar web y worker
pnpm build           # Compilar los paquetes
pnpm test            # Ejecutar las pruebas
pnpm db:migrate      # Aplicar las migraciones
pnpm docker:infra    # Iniciar Postgres, Redis, MinIO y el worker
pnpm docker:down     # Detener los servicios de Docker
```

## Contacto

Preguntas, consultas sobre colaboraciones o comentarios sobre este proyecto:

- LinkedIn: [Socrates Omiliadis](https://www.linkedin.com/in/socratesomiliadis/) | [Apostolos Kakarantzas](https://www.linkedin.com/in/akakarantzas/)
- X / Twitter: [@socratesom](https://x.com/socratesom) | [@aevagnarly](https://x.com/aevagnarly)
