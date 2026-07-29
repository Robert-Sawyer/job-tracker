This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

[![CI](https://github.com/Robert-Sawyer/job-tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/Robert-Sawyer/job-tracker/actions/workflows/ci.yml)

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

| Layer      | File              | Responsibility                                | Knows about               |
| ---------- | ----------------- | --------------------------------------------- | ------------------------- |
| Route      | `*.routes.ts`     | HTTP concerns: parsing, status codes, headers | Fastify, service          |
| Service    | `*.service.ts`    | Business rules, orchestration, authorization  | Repository, domain errors |
| Repository | `*.repository.ts` | Data access and query construction            | Prisma only               |

The rules are one-directional and enforced by convention:

- A service never receives `request` or `reply`. It is plain TypeScript and can be
  unit-tested without an HTTP server.
- A repository never throws HTTP-aware errors. It returns data or `null`.
- A route never contains business logic. If a handler grows past a few lines,
  the logic belongs one layer down.

Services are created by factory functions that take their dependencies as arguments
(`createHealthService(prisma)`) rather than by classes with a DI container. This is the
idiomatic Node approach and makes test doubles trivial — no framework required.

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

### Testing strategy

Tests are integration-level by default: they build the real Fastify instance via
`buildApp()`, drive it through Supertest, and hit a real Postgres instance. There are no
mocked repositories, because the bugs worth catching in a CRUD service live in query
construction, transaction boundaries, and access control — precisely the layer a mock
would replace.

The test database is a separate container running with `fsync=off` and a tmpfs data
directory. Durability guarantees are worthless for a database that is truncated between
tests, and removing them cuts suite time substantially. Schema is applied with
`prisma migrate deploy`, the same command used in deployment, so a passing suite also
proves the committed migration set is coherent.

State is reset with a single `TRUNCATE … RESTART IDENTITY CASCADE` before each test. Test
files run serially (`singleFork`) since they share one database; per-worker schemas would
allow parallelism but add complexity disproportionate to a suite of this size.

Testcontainers was considered as an alternative to a compose service. It is cleaner in CI,
but adds container startup to every local run; with a single dependency the compose
service wins on iteration speed.

### Graceful shutdown

`close-with-grace` intercepts `SIGTERM`/`SIGINT`, stops accepting new connections, drains
in-flight requests, and closes the Prisma pool within a 10-second budget. Without this,
container rollouts drop live requests.

### Versioned migrations

Schema changes go through `prisma migrate`, and the generated SQL is committed to the
repository. `prisma db push` is used only for throwaway experiments and never on any
shared or deployed environment.

## Technical decisions

### Known trade-offs: pagination and search

Two deliberate simplifications in the applications module, both chosen for the expected
data volume of this project (hundreds of rows per user, not millions).

**Offset pagination.** `findMany` uses `skip`/`take` with a parallel `count()` inside a
single transaction, so the page and the total never disagree under concurrent writes. The
known limitation is that `OFFSET n` forces Postgres to scan and discard the preceding rows,
so cost grows linearly with page depth, and rows inserted between requests can shift items
across page boundaries.

The alternative is keyset (cursor) pagination on a stable composite key such as
`(createdAt, id)`, which stays O(log n) at any depth and is immune to drift. It was not
adopted here because it cannot express arbitrary user-selected sort columns without a
cursor per sort order, and it does not provide a total page count — both of which the
current UI relies on. At this scale the offset cost is unmeasurable, and the endpoint caps
`limit` at 100 to bound the worst case.

**Case-insensitive `contains` search.** Filtering by company or position uses
`contains` with `mode: "insensitive"`, which compiles to `ILIKE '%term%'`. A leading
wildcard makes a B-tree index unusable, so this is a sequential scan over the user's rows.

Production-grade alternatives, in increasing order of effort: a `pg_trgm` extension with a
GIN index on the searched columns, which makes `ILIKE '%…%'` index-assisted; or a
`tsvector` column with full-text search, which adds stemming and ranking but loses
substring matching. Neither is justified while the filtered set is already narrowed by
`userId` and bounded by an indexed `(userId, createdAt)` lookup.

Both decisions are localised to `application.repository.ts`. Because the service layer
consumes a repository interface and never constructs queries itself, replacing either
strategy is a single-file change with no impact on routes, services, or the shared
contract.

### Token strategy

Access tokens are short-lived JWTs (15 minutes) returned in the response body and sent by
the client in an `Authorization` header. Refresh tokens are opaque 256-bit random values
stored only in an `httpOnly`, `SameSite`-scoped cookie restricted to `/api/v1/auth`. The
split is deliberate: an XSS payload can read an access token that expires in minutes, but
cannot read the cookie that would grant indefinite access.

Passwords use argon2id with OWASP-recommended parameters (19 MiB, t=2, p=1). Refresh
tokens use SHA-256 instead, because they carry full entropy and require only a fast,
indexable lookup — a slow KDF here would prevent hash-based retrieval without adding
security.

Every refresh rotates: the presented token is revoked and a new one issued. Presenting an
already-revoked token is treated as theft and revokes every active session for that user.

Login returns an identical error for unknown emails and wrong passwords, and performs a
dummy hash when no user exists, so neither the message nor the response time can be used
to enumerate accounts.

### Continuous integration

Every push and pull request runs four parallel jobs: static analysis (Prettier, ESLint,
`tsc --noEmit`), integration tests against a real Postgres service container, a full
workspace build including the Next.js production bundle, and a Docker image build with
layer caching backed by GitHub Actions cache.

Shared setup — pnpm, Node from `.nvmrc`, a frozen-lockfile install, `prisma generate`, and
the `shared` package build — lives in a composite action rather than being duplicated
across jobs. The last two steps are mandatory before any type check: the Prisma client is
generated rather than committed, and `@job-tracker/shared` is consumed from its build
output.

The test job additionally runs `prisma migrate diff --exit-code` against a shadow schema,
which fails the build when `schema.prisma` has drifted from the committed migration set —
a mismatch that would otherwise surface only at deployment time.

The API image is a multi-stage build. Dependency manifests are copied before source so the
install layer is cached independently of code changes, `pnpm deploy` flattens the workspace
into a self-contained production tree, and the runtime stage runs as the unprivileged
`node` user with a `HEALTHCHECK` hitting `/healthz`.

`main` is protected: all four checks must pass, branches must be current, and force pushes
are blocked.

### Client-side data fetching

Authenticated data is fetched from the browser with TanStack Query rather than in React
Server Components. The access token is held in memory on the client and the refresh cookie
is scoped to the API origin and the `/api/v1/auth` path, so a server component has no
credential to forward. Making RSC work would mean widening the cookie scope and proxying
every request through Next — added surface area for no benefit in an app whose pages are
all user-specific and non-cacheable. Server rendering is used for the static shell,
metadata, and unauthenticated pages.

### Token handling in the browser

The access token lives in a module-scoped variable, never in `localStorage` or a
JavaScript-readable cookie, so it cannot be exfiltrated by injected script and disappears
on reload. The session is re-established at startup by a single call to `/auth/refresh`
using the `httpOnly` cookie.

Refresh is single-flight: concurrent 401s share one in-flight refresh promise. This is not
an optimisation — with rotating refresh tokens, parallel refreshes would invalidate each
other and trip the server's token-reuse detection, logging the user out.

### Route protection

Route guards in the client layout are a UX affordance, not a security boundary. Every
protected route is enforced server-side by the API's `authenticate` hook; the guard only
prevents rendering an empty shell to an unauthenticated visitor. Next.js middleware is not
used, since the in-memory token is invisible to it.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
