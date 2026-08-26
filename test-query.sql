INSERT INTO users (id, email, password_hash, user_type, status, is_active, is_verified, first_name, last_name, display_name, onboarding_complete, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'admin@getcaremaster.com',
  '$2a$12$oXSz8fSFnULPzlptR0iuyOgPVsF2XupjLuLXvYRYiWuZamrzqmm1O',
  'super-admin',
  'active',
  true,
  true,
  'Super',
  'Admin',
  'Super Admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active', is_active = true, is_verified = true;
