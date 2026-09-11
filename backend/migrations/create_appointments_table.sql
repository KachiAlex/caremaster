-- Create appointments table if it doesn't exist
-- This matches the schema from migration 033_create_appointments_table.js

CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES users(id),
    caregiver_id UUID,
    doctor_id UUID,
    institution_id UUID,
    title VARCHAR(255),
    description TEXT,
    type VARCHAR(100), -- consultation, follow-up, emergency, care_service
    care_type VARCHAR(100), -- home_care, medical, personal_care, etc.
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, confirmed, in_progress, completed, cancelled, no_show
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    priority VARCHAR(50) DEFAULT 'normal', -- low, normal, high, urgent
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_caregiver_id ON appointments(caregiver_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);

-- Add comments for documentation
COMMENT ON TABLE appointments IS 'Care service appointments and scheduled visits';
COMMENT ON COLUMN appointments.patient_id IS 'The patient/client who requested the appointment (formerly client_id)';
COMMENT ON COLUMN appointments.caregiver_id IS 'The caregiver assigned to provide the care service';
COMMENT ON COLUMN appointments.doctor_id IS 'The doctor assigned (if medical appointment)';
COMMENT ON COLUMN appointments.type IS 'Appointment type: consultation, follow-up, emergency, care_service';
COMMENT ON COLUMN appointments.care_type IS 'Type of care: home_care, medical, personal_care, etc.';
COMMENT ON COLUMN appointments.status IS 'Appointment status: scheduled, confirmed, in_progress, completed, cancelled, no_show';
