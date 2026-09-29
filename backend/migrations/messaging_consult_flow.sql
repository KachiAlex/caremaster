-- Messaging + video-consultation schema fixes and participant backfill.
-- Safe to run multiple times (IF NOT EXISTS / guarded updates).

-- ─── conversations ─────────────────────────────────────────────────────
-- Denormalized display info for participants (name/role) so UIs don't need
-- a users-directory fetch; plus a tenant tag for admin scoping.
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS participant_details JSONB DEFAULT '[]';
ALTER TABLE conversations ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_conversations_participants ON conversations USING GIN (participants);

-- ─── messages ──────────────────────────────────────────────────────────
-- content was a legacy NOT NULL column; the app writes `text`. Drop the
-- constraint (backend mirrors text→content for old readers).
ALTER TABLE messages ALTER COLUMN content DROP NOT NULL;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);

-- ─── telemedicine_appointments ─────────────────────────────────────────
-- Fields the request form sends that were silently dropped by the whitelist.
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS urgency VARCHAR(20) DEFAULT 'normal';
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
ALTER TABLE telemedicine_appointments ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255);
CREATE INDEX IF NOT EXISTS idx_telemed_appt_inst_status ON telemedicine_appointments(institution_id, status);

-- ─── calls ─────────────────────────────────────────────────────────────
-- Deterministic Agora channel per call so both parties join the same room.
ALTER TABLE calls ADD COLUMN IF NOT EXISTS channel_name VARCHAR(255);
ALTER TABLE calls ADD COLUMN IF NOT EXISTS institution_id VARCHAR(255);

-- ─── Backfill: normalize conversation participants to canonical users.id ──
-- Stored values may be users.id, users.firebase_uid, or clients.id — resolve
-- each to the owning users.id so participant scoping works uniformly.
UPDATE conversations c SET
  participants = (
    SELECT jsonb_agg(resolved.canonical_id)
    FROM jsonb_array_elements_text(c.participants) AS p(value)
    CROSS JOIN LATERAL (
      SELECT COALESCE(
        (SELECT u.id::text FROM users u
          WHERE u.id::text = p.value OR u.firebase_uid = p.value LIMIT 1),
        (SELECT cl.user_id::text FROM clients cl
          WHERE cl.id::text = p.value AND cl.user_id IS NOT NULL LIMIT 1),
        p.value
      ) AS canonical_id
    ) resolved
  );

-- participant_details: [{id, name, role}] for display without extra fetches
UPDATE conversations c SET
  participant_details = (
    SELECT jsonb_agg(jsonb_build_object(
      'id', u.id::text,
      'name', COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), u.email),
      'role', u.user_type
    ))
    FROM jsonb_array_elements_text(c.participants) AS p(value)
    JOIN users u ON u.id::text = p.value
  );

-- institution_id from any participant's user row
UPDATE conversations c SET
  institution_id = (
    SELECT u.institution_id::text
    FROM jsonb_array_elements_text(c.participants) AS p(value)
    JOIN users u ON u.id::text = p.value
    WHERE u.institution_id IS NOT NULL
    LIMIT 1
  )
WHERE c.institution_id IS NULL;
