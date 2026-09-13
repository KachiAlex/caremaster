-- Migration to further optimize nurse_reports with clinical accountability and automation
-- Add columns for Digital Sign-off, NEWS score, and Doctor Feedback Loop

-- Digital Signature and content hashing for audit trails
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS signature_data JSONB;

-- NEWS (National Early Warning Score) for automated alerting
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS news_score INTEGER;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS news_data JSONB;

-- Feedback Loop (Doctor interaction)
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITHOUT TIME ZONE;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS acknowledged_by TEXT; -- Doctor ID or name
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS doctor_notes TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS feedback_status VARCHAR(50) DEFAULT 'pending';

-- Photo documentation support
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';

-- Indices for reporting and dashboard alerts
CREATE INDEX IF NOT EXISTS idx_nurse_reports_news_score ON nurse_reports(news_score);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_feedback_status ON nurse_reports(feedback_status);
