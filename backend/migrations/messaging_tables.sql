-- Drop and recreate with snake_case columns to match backend conventions

DROP TABLE IF EXISTS signaling CASCADE;
DROP TABLE IF EXISTS "callNotifications" CASCADE;
DROP TABLE IF EXISTS calls CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;

-- Conversations table (snake_case columns)
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participants JSONB NOT NULL DEFAULT '[]',
  conversation_type TEXT DEFAULT 'general',
  last_message TEXT,
  last_message_time TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  sender_id TEXT NOT NULL,
  text TEXT,
  content TEXT,
  type TEXT DEFAULT 'text',
  sender_name TEXT,
  read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  caller_id TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  call_type TEXT DEFAULT 'video',
  caller_name TEXT,
  recipient_name TEXT,
  status TEXT DEFAULT 'initiating',
  answered_at TIMESTAMP,
  ended_at TIMESTAMP,
  duration INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Call notifications table
CREATE TABLE call_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  call_id TEXT NOT NULL,
  caller_id TEXT,
  call_type TEXT,
  status TEXT DEFAULT 'incoming',
  caller_name TEXT,
  timestamp TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

-- Signaling table for WebRTC
CREATE TABLE signaling (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  type TEXT NOT NULL,
  sdp TEXT,
  data JSONB,
  candidate JSONB,
  "from" TEXT,
  timestamp TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_conversations_lastmsg_time ON conversations (last_message_time DESC);
CREATE INDEX idx_messages_conversation_id ON messages (conversation_id);
CREATE INDEX idx_messages_created_at ON messages (created_at ASC);
CREATE INDEX idx_messages_sender_id ON messages (sender_id);
CREATE INDEX idx_messages_read ON messages (read);
CREATE INDEX idx_calls_caller_id ON calls (caller_id);
CREATE INDEX idx_calls_recipient_id ON calls (recipient_id);
CREATE INDEX idx_calls_call_id ON calls (call_id);
CREATE INDEX idx_calls_created_at ON calls (created_at DESC);
CREATE INDEX idx_call_notifications_user_id ON call_notifications (user_id);
CREATE INDEX idx_call_notifications_call_id ON call_notifications (call_id);
CREATE INDEX idx_call_notifications_status ON call_notifications (status);
CREATE INDEX idx_signaling_call_id ON signaling (call_id);
CREATE INDEX idx_signaling_timestamp ON signaling (timestamp ASC);

-- Enable participant search using JSONB contains
CREATE INDEX idx_conversations_participants ON conversations USING GIN (participants);
