# AI Collaboration Narrative

This narrative reflects the actual implementation session for Keyloop Scenario A. It does not invent bugs or test results.

## Role of AI

AI (Cursor agent) was used as a pair-programmer to:

1. Interpret the Keyloop Scenario A brief and separate requirements from assumptions.
2. Draft system design Mermaid diagrams and documentation scaffolding.
3. Generate NestJS/Prisma boilerplate, booking orchestration, exclusion-constraint SQL, and test suites.
4. Iterate on compiler/lint/test failures during verification.

Human ownership remains with the submitting engineer for architecture choices, rejection of overengineering, and confirmation that tests actually ran.

## Requirements interpretation

- Assessment PDF was **not** present in the repository; the brief embedded in the assignment prompt was treated as authoritative.
- Assumptions (no operating hours, no auth, no bay specialization) were written explicitly in `ASSUMPTIONS.md` rather than silently expanded into features.

## Architectural decisions (AI-assisted, human-locked)

| Decision | Alternatives considered | Why chosen | Validation |
| --- | --- | --- | --- |
| Modular NestJS monolith | Microservices | Intentionally avoided as overengineering for Scenario A | Code structure review |
| Exclusion constraints + app retries (incl. Prisma P2034) | Advisory locks only; SERIALIZABLE alone | DB no-overlap invariant is direct and easy to verify under READ COMMITTED; SERIALIZABLE is a valid alternative with different trade-offs | Integration + concurrency + P2034 unit tests |
| Deterministic UUID ordering | Random pick; least-loaded heuristic | Predictable tests; simplest fairness | Unit/integration assertions |
| Prisma + raw SQL migration for GiST | TypeORM; Knex only | Required stack; Prisma cannot express EXCLUDE | Clean migrate from empty DB / Testcontainers |
| No Redis | Cache availability | Availability is advisory; cache would lie under load | Design review |

## Spec-first flow

1. Wrote `SYSTEM_DESIGN.md`, `ASSUMPTIONS.md`, `IMPLEMENTATION_PLAN.md`, `TEST_STRATEGY.md`.
2. Implemented schema → domain helpers → services → controllers → tests.
3. Updated demo docs after live smoke testing showed Oil Change allows two concurrent bookings (two techs + two bays).

## Code review of AI output

Reviewed generated code for:

- Check-then-act races without DB constraints
- Blind retry reusing stale technician/bay IDs
- Logging of email/VIN
- Treating all DB errors as 409
- Over-abstracted repositories or unnecessary packages

## Bugs / weaknesses found during verification

| Issue | How found | Fix |
| --- | --- | --- |
| Prisma `migrate diff` stdout pollution put `warn` text into SQL | `migrate deploy` failed with syntax error near `warn` | Regenerate SQL with stderr discarded; reset schema |
| `genReqId` returned `undefined` (Pino types) | `pnpm typecheck` | Always return a concrete request id |
| ESLint scanned `dist/` after Nest build | `pnpm lint` fatal parse errors | Ignore `dist/**`; exclude `prisma` from `tsconfig.build.json` |
| Seed CLI `ts-node` not on PATH | `prisma db seed` ENOENT | Use `pnpm exec ts-node` in Prisma seed config |
| Demo “re-POST Oil Change → 409” was wrong | Live curl returned 201 for second booking | Document Full Inspection (single qualified tech) for conflict demo; note Oil Change capacity |
| **CRITICAL** API restart auto-seed deleted appointments | Independent RepoRelay review | `RUN_SEED` default false; upsert-only seed; restart persistence proven |
| **HIGH** 500 responses leaked `Error.message` | Independent RepoRelay review | Generic 500 body + unit/e2e redaction tests |
| ISO8601 without offset accepted | Review MEDIUM-03 | `@IsIso8601WithOffset` validator + tests |
| `docker compose run ... RUN_SEED=true` hung on API start | Persistence proof attempt | Added `SEED_ONLY=true` exit path in entrypoint |

## Suggestions rejected

| Suggestion | Why rejected |
| --- | --- |
| Kafka / outbox for bookings | Out of scope; adds failure modes without assessment value |
| Redis lock for slots | Duplicates Postgres exclusion responsibility |
| Full cancel/reschedule API | Not required; status enum kept for constraint filtering only |
| Soft-delete everywhere | Unnecessary complexity |

## Human review checkpoints

1. After schema + exclusion SQL migration — applied successfully on local Postgres and Testcontainers
2. After booking service transaction/retry logic — unit tests for retry vs generic errors
3. After concurrency integration tests — single-resource 201/409; dual-resource 201/201
4. Before final README/demo package — live smoke of health, Swagger, booking, conflict

## Outcome log

| Checkpoint | Result |
| --- | --- |
| Spec documents created | Done |
| Implementation | Done |
| Review remediation (through re-review #3) | Done — see `.ai-handoff/RESULT.md` |
| Unit tests | Pass (51; includes P2034 retry) |
| Integration/concurrency + seed persistence | Pass (25) |
| E2E + 500 redaction | Pass (3) |
| Typecheck / build / lint (read-only) | Pass |
| Docker compose up --build | Pass |
| Restart persistence + reseed proof | Pass (appointment retained; restart logs show migrate+start, no seed) |
