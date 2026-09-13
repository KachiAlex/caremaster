-- Migration to optimize nurse_reports table for SBAR and Coded Observations
-- Add new columns to nurse_reports table

-- Assessment fields (SBAR)
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS situation TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS background TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS assessment TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS recommendation TEXT;

-- Coded Observations
-- Stores an array of { code: string, description: text, category: string, priority: string }
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS coded_observations JSONB DEFAULT '[]';

-- Priority level determined by the highest observation code
-- values: green, yellow, orange, red
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS priority_code VARCHAR(20) DEFAULT 'green';

-- Mapping for physical assessment fields that were missing
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS patient_condition VARCHAR(50);
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS mental_status VARCHAR(50);
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS mobility_status VARCHAR(50);
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS nutrition_status VARCHAR(50);
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS general_appearance TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS skin_condition VARCHAR(50);
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS pain_level INTEGER;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS pain_location TEXT;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS pain_description TEXT;

-- Detailed activities and medications
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS care_activities JSONB DEFAULT '[]';
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS medications_given JSONB DEFAULT '[]';
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS treatments_provided JSONB DEFAULT '[]';

-- Follow-up
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE;
ALTER TABLE nurse_reports ADD COLUMN IF NOT EXISTS follow_up_notes TEXT;

-- Indices for faster querying
CREATE INDEX IF NOT EXISTS idx_nurse_reports_patient_id ON nurse_reports(patient_id);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_nurse_id ON nurse_reports(nurse_id);
CREATE INDEX IF NOT EXISTS idx_nurse_reports_priority_code ON nurse_reports(priority_code);
