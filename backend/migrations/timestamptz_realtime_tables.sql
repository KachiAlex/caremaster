-- Convert realtime-path time columns to timestamptz.
--
-- Bug: clients write ISO-8601 UTC instants ('2026-10-22T13:51:10.645Z') into
-- naive TIMESTAMP columns, which silently drop the offset and keep the UTC
-- wall time. node-pg then parses the naive value in the *server's* timezone
-- (Europe/Berlin, UTC+2) and emits an instant 2h earlier to the API.
-- Clients see call_notifications 2h old and instantly mark them 'expired',
-- so incoming calls never ring. Same skew corrupts calls/messages times.
--
-- Existing values were written as UTC wall times (client serverTimestamp()
-- ISO / JS Date params), so interpret them AT TIME ZONE 'UTC'. The exception
-- is call_notifications.created_at, which is filled by DEFAULT NOW() and
-- therefore holds Europe/Berlin wall times.
--
-- signaling.timestamp / signaling.created_at and calls.updated_at are
-- already timestamptz and need no change.

BEGIN;

ALTER TABLE call_notifications
  ALTER COLUMN "timestamp" TYPE timestamptz USING ("timestamp" AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at  TYPE timestamptz USING (created_at  AT TIME ZONE 'Europe/Berlin'),
  ALTER COLUMN updated_at  TYPE timestamptz USING (updated_at  AT TIME ZONE 'UTC');

ALTER TABLE calls
  ALTER COLUMN created_at  TYPE timestamptz USING (created_at  AT TIME ZONE 'UTC'),
  ALTER COLUMN started_at  TYPE timestamptz USING (started_at  AT TIME ZONE 'UTC'),
  ALTER COLUMN answered_at TYPE timestamptz USING (answered_at AT TIME ZONE 'UTC'),
  ALTER COLUMN ended_at    TYPE timestamptz USING (ended_at    AT TIME ZONE 'UTC');

ALTER TABLE messages
  ALTER COLUMN created_at TYPE timestamptz USING (created_at AT TIME ZONE 'UTC'),
  ALTER COLUMN sent_at    TYPE timestamptz USING (sent_at    AT TIME ZONE 'UTC'),
  ALTER COLUMN read_at    TYPE timestamptz USING (read_at    AT TIME ZONE 'UTC');

ALTER TABLE conversations
  ALTER COLUMN last_message_at   TYPE timestamptz USING (last_message_at   AT TIME ZONE 'UTC'),
  ALTER COLUMN last_message_time TYPE timestamptz USING (last_message_time AT TIME ZONE 'UTC'),
  ALTER COLUMN created_at        TYPE timestamptz USING (created_at        AT TIME ZONE 'UTC'),
  ALTER COLUMN updated_at        TYPE timestamptz USING (updated_at        AT TIME ZONE 'UTC');

COMMIT;
