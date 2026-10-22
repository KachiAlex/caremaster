-- Fix legacy telemedicine_calls records: normalize channel_name to the
-- canonical consult_<appointment_id> format and backfill missing start_time.
-- Safe to run multiple times (WHERE clauses guard re-runs).
--
-- Legacy records used channel_name like 'appointment_<uuid>_<ms-timestamp>'
-- (from an older code path) and often had start_time NULL because the
-- creating code never populated it.

UPDATE telemedicine_calls
SET channel_name = 'consult_' || appointment_id
WHERE channel_name IS NULL
   OR channel_name NOT LIKE 'consult_%';

-- start_time is NOT NULL in the logical model (the call started when the row
-- was created). Backfill with created_at for rows that pre-date the fix.
UPDATE telemedicine_calls
SET start_time = created_at
WHERE start_time IS NULL
  AND created_at IS NOT NULL;
