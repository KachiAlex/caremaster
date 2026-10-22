-- Video-consultation request notifications: schema alignment.
-- Safe to run multiple times (IF NOT EXISTS everywhere).
--
-- The notification dispatcher and the frontend notification API write
-- read / priority / data / institution_id / read_at / deduplication_key,
-- but the baseline notifications table only has category/status/is_urgent/
-- metadata — inserts silently failed, so admin notifications (including new
-- video consultation requests) were never persisted.

-- ─── notifications ─────────────────────────────────────────────────────
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT FALSE;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium';
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS read_at TIMESTAMP;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS deduplication_key VARCHAR(255);

-- Backfill legacy rows: status/category/is_urgent/metadata from the
-- original schema map onto the new columns.
UPDATE notifications SET read = TRUE WHERE status IN ('read', 'dismissed') AND read = FALSE;
UPDATE notifications SET priority = 'high' WHERE is_urgent = TRUE AND priority = 'medium';
UPDATE notifications SET data = metadata WHERE data IS NULL AND metadata IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);
-- Idempotent delivery: one notification per (user, deduplication_key).
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup_key
  ON notifications(user_id, deduplication_key) WHERE deduplication_key IS NOT NULL;

-- ─── telemedicine_appointments ─────────────────────────────────────────
-- Client video-consultation requests live here (status='requested' until an
-- admin assigns a doctor). Guarded CREATE for environments where the table
-- was provisioned out-of-band; ALTERs cover drift on existing tables.
CREATE TABLE IF NOT EXISTS telemedicine_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id VARCHAR(255),
  client_name VARCHAR(255),
  doctor_id VARCHAR(255),
  doctor_name VARCHAR(255),
  institution_id VARCHAR(255),
  appointment_date TIMESTAMP,
  status VARCHAR(30) DEFAULT 'requested',
  reason TEXT,
  notes TEXT,
  type VARCHAR(20) DEFAULT 'video',
  duration INTEGER DEFAULT 30,
  urgency VARCHAR(20) DEFAULT 'normal',
  channel_name VARCHAR(255),
  requested_by VARCHAR(255),
  billing_mode VARCHAR(50),
  consultation_log_id VARCHAR(255),
  bill_id VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS client_id VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS client_name VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS doctor_id VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS doctor_name VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS appointment_date TIMESTAMP;
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'requested';
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'video';
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS duration INTEGER DEFAULT 30;
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'normal';
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS billing_mode VARCHAR(50);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS consultation_log_id VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS bill_id VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_telemed_appt_status ON telemedicine_appointments(status);
CREATE INDEX IF NOT EXISTS idx_telemed_appt_inst_status ON telemedicine_appointments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_telemed_appt_client ON telemedicine_appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_telemed_appt_doctor ON telemedicine_appointments(doctor_id);
