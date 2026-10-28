-- Convert telemedicine_appointments.appointment_date to timestamptz.
--
-- Bug: scheduling clients send a JS Date, serialized as a UTC ISO instant
-- ('2026-10-26T06:30:00.000Z'), into a naive TIMESTAMP column. The offset is
-- dropped and the UTC wall time is kept, so the appointment reads one hour
-- off for Africa/Lagos users and the client message shows the wrong time.
--
-- Existing values were written as UTC wall times, so interpret them AT TIME
-- ZONE 'UTC'.

BEGIN;

ALTER TABLE telemedicine_appointments
  ALTER COLUMN appointment_date TYPE timestamptz USING (appointment_date AT TIME ZONE 'UTC');

COMMIT;
