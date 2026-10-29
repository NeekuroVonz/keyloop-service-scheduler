# Keyloop Unified Service Scheduler

Production-minded NestJS REST API that books dealership service appointments by atomically allocating a **qualified technician** and an **active service bay**, with PostgreSQL exclusion constraints preventing double-booking under concurrency.

## Recommended getting started

```bash
# 1) Start PostgreSQL
docker compose up -d postgres

# 2) Install & configure
pnpm install
cp .env.example .env

# 3) Migrate + seed fixture data
pnpm db:setup

# 4) Run API
pnpm start:dev
```

- API: http://localhost:3000  
- Swagger: http://localhost:3000/api/docs  
- Health: http://localhost:3000/api/health  

### Full stack via Docker

```bash
docker compose up --build -d
# Load demo fixtures once (opt-in; never runs on normal API restart)
docker compose run --rm -e RUN_SEED=true -e SEED_ONLY=true api
```

The API container applies migrations on start. **`RUN_SEED` defaults to `false`** so restarting the API never deletes appointments. Seed upserts fixture master data only and does not delete bookings.

### Load / refresh demo fixtures (explicit, non-destructive)

```bash
# Local
pnpm prisma:seed

# Docker (seed then exit — does not start a second API process)
docker compose run --rm -e RUN_SEED=true -e SEED_ONLY=true api
```

Upserts fixture master data only; never deletes appointments.

## Seed fixture IDs (placeholders for demos)

| Entity | UUID |
| --- | --- |
| Dealership Downtown | `11111111-1111-4111-8111-111111111111` |
| Customer Alice | `22222222-2222-4222-8222-222222222221` |
| Vehicle Alice Civic | `33333333-3333-4333-8333-333333333331` |
| Service Oil Change (60 min) | `44444444-4444-4444-8444-444444444441` |

## Example booking

```bash
curl -s -X POST http://localhost:3000/api/appointments \
  -H 'content-type: application/json' \
  -d '{
    "customerId": "22222222-2222-4222-8222-222222222221",
    "vehicleId": "33333333-3333-4333-8333-333333333331",
    "dealershipId": "11111111-1111-4111-8111-111111111111",
    "serviceTypeId": "44444444-4444-4444-8444-444444444441",
    "startAt": "2099-03-01T09:00:00+07:00"
  }'
```

## Commands

| Command | Purpose |
| --- | --- |
| `pnpm start:dev` | Dev server with watch |
| `pnpm build` / `pnpm start:prod` | Production build & run |
| `pnpm typecheck` | TypeScript check |
| `pnpm lint` | ESLint (read-only) |
| `pnpm lint:fix` | ESLint with autofix |
| `pnpm test:unit` | Unit tests |
| `pnpm test:integration` | PostgreSQL integration + concurrency (Docker required) |
| `pnpm test:e2e` | HTTP e2e against Testcontainers Postgres |
| `pnpm test` | All test suites |
| `pnpm prisma:migrate:deploy` | Apply migrations |
| `pnpm prisma:seed` | Seed fixtures |
| `pnpm db:setup` | migrate deploy + seed |

## Architecture (short)

Modular monolith: Controllers → Application services → Prisma repositories → PostgreSQL.

Critical invariant: overlapping `CONFIRMED` appointments cannot share a technician or service bay. Enforced with GiST exclusion constraints on `tstzrange(..., '[)')` plus application transactions and bounded retries.

Details: [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md) · Assumptions: [docs/ASSUMPTIONS.md](docs/ASSUMPTIONS.md)

## AI collaboration (summary)

AI assisted spec drafting, Nest/Prisma scaffolding, and test generation. Human-locked decisions: exclusion constraints as source of truth, no Redis/Kafka, half-open intervals, deterministic UUID allocation. All quality claims are backed by commands actually executed during verification. Full narrative: [docs/AI_COLLABORATION.md](docs/AI_COLLABORATION.md).

## Demo

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for a 5–10 minute walkthrough.

## Documentation index

- [System Design](docs/SYSTEM_DESIGN.md)
- [Assumptions](docs/ASSUMPTIONS.md)
- [Implementation Plan](docs/IMPLEMENTATION_PLAN.md)
- [Test Strategy](docs/TEST_STRATEGY.md)
- [AI Collaboration](docs/AI_COLLABORATION.md)
- [Demo Script](docs/DEMO_SCRIPT.md)
