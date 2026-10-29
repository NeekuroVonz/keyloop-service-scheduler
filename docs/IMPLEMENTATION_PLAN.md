# Implementation Plan

## Stages

### Stage 0 — Repository inspection

- Empty repo (no assessment PDF present). Requirements taken from the provided brief.
- Preserve `.git`; do not commit secrets or `dbeaver-mcp.log`.

### Stage 1 — Foundation

1. Bootstrap NestJS (TypeScript strict) with pnpm.
2. Add Prisma, PostgreSQL driver, Swagger, Pino, class-validator, Testcontainers, Jest/Supertest.
3. Docker Compose (Postgres), Dockerfile, `.env.example`.
4. Prisma schema + initial migration + SQL migration for `btree_gist` + exclusion constraints.
5. Seed script with stable UUIDs for demos.

### Stage 2 — Domain & API

1. Pure domain helpers: duration, overlap, eligibility.
2. Modules: health, dealerships, service-types, availability, appointments.
3. Booking service with transaction + bounded retry on exclusion violations.
4. Global validation pipe, exception filter, request-id interceptor, logging.

### Stage 3 — Tests

1. Unit tests for domain + service decision logic.
2. Integration tests against Testcontainers PostgreSQL.
3. Concurrent booking tests (single resource and multi-resource).

### Stage 4 — Verification & docs

1. Lint, typecheck, unit, integration, build.
2. Docker Compose smoke (migrate, seed, health).
3. Finalize README, DEMO_SCRIPT, AI_COLLABORATION.

## File placement

Follow the guideline under `src/modules/*`, `prisma/`, `test/{unit,integration,e2e}/`, `docs/`.

## Risk notes

- Prisma drift: exclusion SQL lives in a dedicated migration; do not recreate via `db push` alone in CI.
- Testcontainers needs Docker daemon.
- Node 26: pin Nest/Prisma versions known compatible; verify install.
