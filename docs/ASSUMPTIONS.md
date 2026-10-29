# Assumptions

This document separates the **Keyloop Scenario A brief**, **engineering decisions** chosen for this solution, and **product assumptions** that keep scope minimal.

## Keyloop Scenario A brief (product requirements)

From the Keyloop assessment brief (PDF / scenario description):

- Build an Appointment Scheduler that books a service for a vehicle at a dealership and desired time.
- Availability requires both an appropriate ServiceBay and a qualified Technician for the entire service duration.
- Persist appointments linking customer, vehicle, technician, and service bay.
- Deliver a working system with clear design, tests, and AI-assisted engineering evidence.
- Evaluation includes system design, technical execution, AI verification, and communication.

The brief does **not** mandate a specific concurrency primitive, interval notation, status enum, or stack. Those are engineering choices below.

## Engineering decisions (implementation constraints for this submission)

Chosen to satisfy reliability and assessment clarity — not because the PDF lists them verbatim:

| Decision | Rationale |
| --- | --- |
| NestJS + TypeScript + Prisma + PostgreSQL REST API | Required stack for this coding challenge submission |
| PostgreSQL exclusion constraints (`tstzrange`, `&&`, `'[)'`) | Database-enforced anti-double-booking under concurrency |
| Half-open intervals `[startAt, endAt)` | Unambiguous adjacent-slot semantics |
| Only `CONFIRMED` appointments consume resources | Simple capacity model; cancel API not required |
| Modular monolith (no microservices / Kafka / Redis) | Intentionally avoided as overengineering for Scenario A |
| Availability endpoint is advisory | Prevents treating a GET as a reservation |

## Documented product assumptions

### A1 — Operating hours and calendars

No operating hours, lunch breaks, holidays, or shift schedules are enforced. Any future `startAt` is acceptable if resources are free. Dealership `timezone` is stored for display/context; booking math uses UTC/`timestamptz`.

### A2 — Service bay specialization

Service bays are not specialized by service type. Any active bay at the dealership may serve any service type.

### A3 — Technician capacity

A technician can perform only one appointment at a time. Qualification is binary via `TechnicianQualification` (no skill levels).

### A4 — Appointment status

Statuses: `CONFIRMED` | `CANCELLED`. Seed and booking create only `CONFIRMED`. Exclusion constraints apply only to `CONFIRMED` rows. No public cancel endpoint.

### A5 — Authentication

No authentication or authorization. Assumed acceptable for this assessment; production would add identity and dealership-scoped access.

### A6 — Timezone handling

- Clients **must** send `startAt` as ISO 8601 with an explicit offset (`Z` or `±HH:MM` / `±HHMM`).
- Date-only, offset-less date-times, and impossible calendar dates (e.g. `2026-02-30`) are rejected with **400** (strict calendar validation; JS Date normalization is not accepted).
- PostgreSQL stores `timestamptz` (UTC internally).
- API responses return ISO 8601 UTC (`Z`).
- Dealership timezone is not used to reinterpret `startAt`.

### A7 — Resource selection order

When multiple technicians/bays are free, allocate by deterministic ascending UUID order.

### A8 — Past bookings

`startAt` must be strictly in the future relative to server UTC at request time. Both `POST /api/appointments` and `GET /api/availability` reject past `startAt` with **400** for a consistent API contract.

### A9 — Idempotency

Booking is not idempotent. Duplicate POSTs may create multiple appointments if resources remain available.

### A10 — Customer/vehicle ownership

Vehicle must belong to the given `customerId`. Enforced in the booking application service (404). Not enforced with a composite DB FK for assessment simplicity.

### A11 — Cross-dealership resource integrity

Technician and service bay must belong to the appointment dealership. Enforced by dealership-scoped resource queries in the booking path. Not enforced with triggers/composite FKs for this assessment.

### A12 — Demo seeding

`pnpm prisma:seed` / `RUN_SEED=true` upserts fixture master data only and **never deletes appointments**. API container startup defaults to `RUN_SEED=false`.

### A13 — Out of scope

- Microservices, message buses, Redis, Kubernetes, GraphQL (avoided as overengineering)
- Frontend UI beyond Swagger/cURL
- Notifications, payments, waitlists, rescheduling
- Soft deletes, multi-tenancy beyond dealership FK scoping
- Rate limiting and API keys

## Mapping summary

| Topic | Classification |
| --- | --- |
| Bay + qualified tech for full duration | Keyloop brief |
| Persistent appointment record | Keyloop brief |
| Exclusion constraints / half-open intervals | Engineering decision |
| CONFIRMED consumes resources | Engineering decision |
| No operating hours | Assumption A1 |
| No bay specialization | Assumption A2 |
| No auth | Assumption A5 |
| Deterministic UUID ordering | Assumption A7 |
| Non-destructive opt-in seed | Assumption A12 |
