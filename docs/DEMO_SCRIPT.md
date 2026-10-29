# Demo Script (5–10 minutes)

Use this outline for a live walkthrough. Do **not** claim a video was recorded unless you actually produce one.

## Prerequisites

```bash
docker compose up -d postgres
cp .env.example .env   # if needed
pnpm install
pnpm db:setup
pnpm start:dev
```

Swagger: http://localhost:3000/api/docs

### Seed fixture IDs (placeholders)

| Entity | ID |
| --- | --- |
| Downtown dealership | `11111111-1111-4111-8111-111111111111` |
| Customer Alice | `22222222-2222-4222-8222-222222222221` |
| Alice Civic | `33333333-3333-4333-8333-333333333331` |
| Oil Change (60m) | `44444444-4444-4444-8444-444444444441` |
| Full Inspection (120m, one qualified tech) | `44444444-4444-4444-8444-444444444443` |

## 0:00–0:45 — Introduction

- Problem: replace manual booking; need bay + qualified technician for full duration.
- Deliverable: NestJS modular monolith + PostgreSQL with DB-enforced anti-double-booking.

## 0:45–2:30 — Architecture

- Open `docs/SYSTEM_DESIGN.md` Mermaid diagrams (context, sequence, ER, decision flow).
- Highlight Controller → Service → Repository and exclusion constraints.

## 2:30–4:00 — Business rules

- Half-open `[start, end)` intervals.
- Only `CONFIRMED` consumes capacity.
- Deterministic resource pick by UUID.
- Transaction + bounded retry on exclusion conflicts.

## 4:00–5:30 — Live API demo

### Successful booking (Full Inspection — single qualified technician)

```bash
curl -s -X POST http://localhost:3000/api/appointments \
  -H 'content-type: application/json' \
  -d '{
    "customerId": "22222222-2222-4222-8222-222222222221",
    "vehicleId": "33333333-3333-4333-8333-333333333331",
    "dealershipId": "11111111-1111-4111-8111-111111111111",
    "serviceTypeId": "44444444-4444-4444-8444-444444444443",
    "startAt": "2099-04-01T09:00:00+07:00"
  }' | jq
```

Expect **201** with `technicianId` and `serviceBayId`.

### Conflict (same slot)

Re-run the same request. Expect **409** (only one tech is qualified for Full Inspection).

> Note: Oil Change has two qualified techs and two bays, so two overlapping Oil Change bookings can both succeed; the third returns 409.

### Advisory availability

```bash
curl -s 'http://localhost:3000/api/availability?dealershipId=11111111-1111-4111-8111-111111111111&serviceTypeId=44444444-4444-4444-8444-444444444443&startAt=2099-04-01T09:00:00%2B07:00' | jq
```

Note: advisory only — not a reservation.

## 5:30–6:45 — Concurrency proof

```bash
pnpm test:integration
```

Call out:

- Single tech + single bay → one 201, one 409.
- Dual resources → both 201 with distinct assignments.
- Direct SQL exclusion constraint test.

## 6:45–8:15 — AI collaboration

- Spec-first docs before code.
- Rejected Kafka/Redis.
- Verification via real Postgres Testcontainers, not mocks.
- See `docs/AI_COLLABORATION.md` for actual findings.

## 8:15–9:00 — Lessons / next steps

- Add operating hours only with explicit product rules.
- OpenTelemetry metrics from the documented signals.
- Idempotency-Key for client retries.
