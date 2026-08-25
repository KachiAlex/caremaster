-- Add missing columns for API compatibility
ALTER TABLE calls ADD COLUMN IF NOT EXISTS duration INTEGER;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message_time TIMESTAMP;
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS last_message TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS conversation_id VARCHAR(255);
