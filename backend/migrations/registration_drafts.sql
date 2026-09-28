-- Server-side drafts for the admin client-registration flow.
-- Lets admins save an in-progress client registration and resume it later
-- (including from another device). Passwords are never stored — the frontend
-- strips loginPassword/confirmPassword before saving, and the payload is
-- kept in form_data JSONB so new form fields don't require schema changes.
CREATE TABLE IF NOT EXISTS registration_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    institution_id UUID,
    created_by UUID,            -- admin user id who started the draft
    created_by_name VARCHAR(255),
    client_name VARCHAR(255),   -- denormalized label for the drafts list
    form_data JSONB DEFAULT '{}',
    current_step INTEGER DEFAULT 0,
    national_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'in_progress',  -- in_progress | completed | discarded
    last_saved_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITHOUT TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_registration_drafts_institution ON registration_drafts(institution_id);
CREATE INDEX IF NOT EXISTS idx_registration_drafts_status ON registration_drafts(status);
CREATE INDEX IF NOT EXISTS idx_registration_drafts_saved ON registration_drafts(institution_id, status, last_saved_at);
