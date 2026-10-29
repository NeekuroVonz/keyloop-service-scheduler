# Test Strategy

## Goals

Prove booking correctness, half-open interval semantics, resource eligibility, HTTP contracts, and **database-enforced** concurrency safety against real PostgreSQL.

## Layers

### Unit (`test/unit`)

| Area | Coverage |
| --- | --- |
| Duration | `endAt` from `startAt` + minutes |
| Overlap | Adjacent non-overlap; partial overlap; identical; nested |
| Eligibility | Active + qualified + same dealership filters |
| Validation | DTO rejection of bad UUIDs / missing fields |
| Service logic | Decision paths with mocked repository (no Postgres) |
| Errors | Mapping to Nest HTTP exceptions |

### Integration (`test/integration`)

Real PostgreSQL via Testcontainers:

1. Successful appointment creation
2. Persisted customer/vehicle relationships
3. Qualified technician allocation
4. Dealership-scoped resources
5. No qualified technician → 409
6. No available bay → 409
7. Technician already booked → 409
8. Bay already booked → 409
9. Partial overlap → conflict
10. Adjacent appointments → both succeed
11. Different service durations
12. Concurrent overlapping → exactly one 201
13. Concurrent with multiple resources → both can succeed
14. Transaction rollback on failure
15. Exclusion constraint violation at SQL level

### E2E (`test/e2e`)

Optional thin HTTP smoke against app module + Testcontainers (health + one booking). Primary concurrency proof lives in integration tests.

## Concurrency fixture

- One dealership, one qualified active technician, one active bay
- Two parallel `POST /api/appointments` for the same slot
- Assert: one 201, one 409, exactly one `CONFIRMED` row

Second scenario: two technicians + two bays → both concurrent bookings may succeed (201/201) without violating constraints.

## Rules

- No mocked Postgres for concurrency.
- No flaky `sleep` for race timing; fire requests with `Promise.all`.
- Deterministic seed UUIDs.
- Migrations applied inside test setup before suites run.

## Commands

```bash
pnpm test:unit
pnpm test:integration
pnpm test:e2e
pnpm test
```

Docker must be available for Testcontainers.
