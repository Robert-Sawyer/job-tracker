This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Architecture

The API is a standalone Node service (Fastify) consumed by a separate Next.js client.
Backend and frontend share nothing at runtime — only TypeScript types and Zod schemas
from `packages/shared`.

apps/api/src/

├── config/ environment parsing and validation

├── db/ Prisma client and schema-derived helpers

├── lib/ cross-cutting utilities (logger, error types)

├── plugins/ Fastify plugins (DI, error handling)

└── modules/ domain modules, each split into three layers


### Layered modules

Each domain module is split by responsibility, not by file type:

| Layer | File | Responsibility | Knows about |
|---|---|---|---|
| Route | `*.routes.ts` | HTTP concerns: parsing, status codes, headers | Fastify, service |
| Service | `*.service.ts` | Business rules, orchestration, authorization | Repository, domain errors |
| Repository | `*.repository.ts` | Data access and query construction | Prisma only |

The rules are one-directional and enforced by convention:

- A service never receives `request` or `reply`. It is plain TypeScript and can be
  unit-tested without an HTTP server.
- A repository never throws HTTP-aware errors. It returns data or `null`.
- A route never contains business logic. If a handler grows past a few lines,
  the logic belongs one layer down.

Services are created by factory functions that take their dependencies as arguments
(`createHealthService(prisma)`) rather than by classes with a DI container. This is the
idiomatic Node approach and makes test doubles trivial — no framework required.

## Technical decisions

### Fastify over Express

Fastify was chosen for first-class TypeScript support, a real plugin encapsulation model,
built-in Pino logging, and schema-based serialization. Express requires assembling all of
this from third-party middleware with weaker typing.

### Fail-fast configuration

`config/env.ts` validates the entire environment with Zod at startup and exits with a
readable error if anything is missing or malformed. There is no `process.env.X!` anywhere
in the codebase — a misconfigured deployment fails immediately instead of at the first
request that happens to need the variable.

### Dependency injection via plugins

`PrismaClient` is instantiated once, attached to the Fastify instance with
`fastify-plugin`, and disconnected in an `onClose` hook. Handlers access it through
`app.prisma` instead of importing a module-level singleton, which keeps the instance
swappable in tests and tied to the server lifecycle.

### Uniform error contract

A single `setErrorHandler` translates domain errors (`AppError` subclasses), Zod failures,
and known Prisma errors into one response shape:

```json
{
  "error": { "code": "NOT_FOUND", "message": "Application not found", "details": null },
  "requestId": "7f3c9e2a-..."
}
```

Clients branch on a stable `code`, never on a message string. Internal error messages are
suppressed in production and only the `requestId` is exposed.

### Request correlation

Every request gets an ID — reused from an inbound `x-request-id` header when present,
otherwise generated. The ID appears in every log line for that request and is echoed back
in the response header and error body, so a user-reported failure maps directly to a log
entry.

### Log redaction

Pino is configured to redact `authorization` and `cookie` headers, `set-cookie` responses,
and any `password` or `passwordHash` field. Credentials must never reach stdout, where log
aggregators retain them indefinitely.

### Liveness vs readiness

`/healthz` reports only that the process is alive and always returns 200.
`/readyz` verifies the database with `SELECT 1` and returns 503 when a dependency is down.
Orchestrators treat these signals differently: a failing liveness probe restarts the
container, a failing readiness probe only removes it from the load balancer.

### Testable composition

`buildApp()` returns a configured but non-listening Fastify instance; `index.ts` owns
`listen()` and signal handling. Integration tests build the app in-process and use
`app.inject()`, so the suite never binds a port and runs in parallel without conflicts.

### Graceful shutdown

`close-with-grace` intercepts `SIGTERM`/`SIGINT`, stops accepting new connections, drains
in-flight requests, and closes the Prisma pool within a 10-second budget. Without this,
container rollouts drop live requests.

### Versioned migrations

Schema changes go through `prisma migrate`, and the generated SQL is committed to the
repository. `prisma db push` is used only for throwaway experiments and never on any
shared or deployed environment.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
