-- Minimal data-integrity CHECKs. Cross-dealership / vehicle-owner consistency
-- remain enforced in the booking application service (documented assumption).

ALTER TABLE "service_types"
  ADD CONSTRAINT "service_types_duration_positive"
  CHECK ("duration_minutes" > 0);

ALTER TABLE "appointments"
  ADD CONSTRAINT "appointments_end_after_start"
  CHECK ("end_at" > "start_at");
