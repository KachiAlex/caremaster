-- Migration to implement Referral Tracking
-- Create referrals table and linked indices

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id TEXT NOT NULL,
    referred_by_institution_id TEXT NOT NULL,
    referred_to_facility TEXT NOT NULL, -- Name of specialist or hospital
    referred_to_institution_id TEXT, -- Optional, if they are also on the platform
    referral_reason TEXT NOT NULL,
    clinical_notes TEXT,
    status VARCHAR(50) DEFAULT 'sent', -- sent, received, appointment_scheduled, seen, responded, closed
    priority VARCHAR(20) DEFAULT 'normal', -- normal, urgent, emergency
    
    sent_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    received_at TIMESTAMP WITHOUT TIME ZONE,
    appointment_date TIMESTAMP WITHOUT TIME ZONE,
    responded_at TIMESTAMP WITHOUT TIME ZONE,
    
    specialist_response TEXT,
    next_actions TEXT,
    
    attachments JSONB DEFAULT '[]', -- Array of {name, url, type}
    metadata JSONB DEFAULT '{}',
    
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

-- Indices for tracking
CREATE INDEX IF NOT EXISTS idx_referrals_patient_id ON referrals(patient_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_by ON referrals(referred_by_institution_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_sent_at ON referrals(sent_at);
