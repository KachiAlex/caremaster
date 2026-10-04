-- One call row per appointment. Both parties create a telemedicine_calls
-- row when joining a consult — the API dedups, but a unique index makes the
-- guarantee safe against a simultaneous-join race.
CREATE UNIQUE INDEX IF NOT EXISTS idx_telemedicine_calls_appointment_id
  ON telemedicine_calls(appointment_id)
  WHERE appointment_id IS NOT NULL;
