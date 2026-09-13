-- Add notification_preferences column to users table
-- Stores per-user notification mute preferences as jsonb
-- Example: {"appointment_reminders": true, "system_updates": false, ...}

ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT NULL;

-- Add index for faster preference lookups (optional, since we query by id)
-- The users table is already indexed by id (PK)

COMMENT ON COLUMN users.notification_preferences IS 'Per-user notification mute preferences stored as jsonb. Keys map to notification types. Null = use defaults (all enabled except system_updates).';
