-- Align nurse_reports schema with the write whitelist in backend/routes/data.js.
-- The frontend sends client_name on every report insert; without this column
-- the insert fails with "column \"client_name\" of relation \"nurse_reports\"
-- does not exist" (42703) and the report is lost.

ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);

-- Backfill client_name from metadata where available (best-effort)
UPDATE nurse_reports
SET client_name = metadata->>'client_name'
WHERE client_name IS NULL
  AND metadata ? 'client_name';
