# Job Tracker

[![CI](https://github.com/Robert-Sawyer/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Robert-Sawyer/job-tracker/actions/workflows/ci.yml)

A full-stack application for tracking job applications, managing follow-ups, and monitoring
progress through the hiring pipeline. It combines a Next.js web client with a Fastify API,
PostgreSQL persistence, and Redis-backed background jobs.

## Highlights

- Secure registration, login, short-lived JWT access tokens, and rotating refresh tokens.
- Application tracking with filtering, sorting, pagination, history, Kanban, and dashboard
  statistics.
- Follow-up reminders scheduled seven days after an application is submitted.
- Zod validation shared between the API and web forms, structured errors, correlated logs, and
  integration tests against PostgreSQL.
- Production hardening with Helmet, strict CORS, rate limiting, validated configuration, and
  public OpenAPI documentation.

## Stack

| Area          | Technologies                                                  |
| ------------- | ------------------------------------------------------------- |
| Web           | Next.js, React, TanStack Query, React Hook Form, Tailwind CSS |
| API           | Fastify, Zod, Prisma, Pino                                    |
| Data and jobs | PostgreSQL, Redis, BullMQ                                     |
| Tooling       | TypeScript, pnpm, Vitest, Docker Compose, GitHub Actions      |

## Quick start

### Prerequisites

- Node.js `22.23.1` (see [`.nvmrc`](.nvmrc))
- pnpm `11.17.0` via Corepack
- Docker Desktop or another Docker Compose-compatible runtime

### Install and configure

```bash
git clone https://github.com/Robert-Sawyer/job-tracker.git
cd job-tracker
corepack enable
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

Replace the example `JWT_SECRET` in `apps/api/.env` with a unique value of at least 32
characters before starting the API. PowerShell users can use `Copy-Item` in place of `cp`.

### Run the complete local stack

```bash
docker compose up -d db redis
pnpm --filter @job-tracker/api db:deploy
docker compose up -d --build worker
pnpm dev
```

The local services are available at:

| Service         | URL or connection                                                  |
| --------------- | ------------------------------------------------------------------ |
| Web application | [http://localhost:3000](http://localhost:3000)                     |
| API             | [http://localhost:3001](http://localhost:3001)                     |
| Swagger UI      | [http://localhost:3001/docs/](http://localhost:3001/docs/)         |
| OpenAPI JSON    | [http://localhost:3001/docs/json](http://localhost:3001/docs/json) |
| PostgreSQL      | `localhost:5433`                                                   |
| Redis           | `127.0.0.1:6379`                                                   |

The worker runs separately in Docker and processes due follow-up jobs. Inspect it with
`docker compose logs -f worker`, and stop the local services with `docker compose down`.

### Test and verify

```bash
docker compose up -d db-test
pnpm --filter @job-tracker/api test
pnpm lint
pnpm typecheck
pnpm build
```

The API test suite applies migrations to an isolated PostgreSQL database on `localhost:5434`.

## Deployment

The production topology uses Vercel for the web application, Railway for the API and worker,
and Neon for PostgreSQL. Redis is required for BullMQ and is also used as the shared rate-limit
store when the API is scaled beyond one replica.

Follow the step-by-step [production deployment guide](docs/production-deployment.md) for
environment variables, Railway service configuration, Neon pooling, Vercel setup, cookies,
CORS, health checks, and post-deployment verification.

After deployment, Swagger remains public at `https://<api-host>/docs/`.

## Repository layout

```text
apps/
  api/          Fastify API, Prisma schema, migrations, and tests
  web/          Next.js web application
packages/
  shared/       Shared Zod schemas and TypeScript contracts
docs/
  architecture.md              Architecture and engineering decisions
  production-deployment.md     Production deployment guide
  development-cleanup.md       Local Docker and pnpm cleanup guidance
```

## Documentation

| Document                                                       | Purpose                                                                                                 |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| [Architecture and engineering decisions](docs/architecture.md) | Application structure, background jobs, authentication, data flow, testing, and intentional trade-offs. |
| [Production deployment](docs/production-deployment.md)         | Vercel, Railway, Neon, Redis, environment variables, security, and verification.                        |
| [Development cleanup](docs/development-cleanup.md)             | Safe local cleanup of Docker Desktop resources and the pnpm store.                                      |

## Known limitation

The application status update and its BullMQ job are separate writes. A Redis outage between
them can leave an application marked as `applied` without a scheduled follow-up. A transactional
outbox is the next reliability improvement; the rationale is documented in
[Architecture and engineering decisions](docs/architecture.md#background-jobs-and-reminders).
