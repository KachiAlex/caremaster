# CareMaster — Agent Notes

## Production environment (VPS `caremaster-vps`)

The deployed stack does NOT match the repo directory names. Verify before
any data operation:

- **Live backend**: PM2 app `caremaster-backend`, script
  `/var/www/caremaster-backend/server.js` (separate from the repo checkout at
  `/var/www/caremaster/backend`).
- **Live database**: PostgreSQL database **`elderx_app`** (legacy name), user
  `elderx_user`. There is ALSO a `caremaster` database on the same server —
  it is NOT what production reads/writes.
- Always confirm the real DB via `pm2 describe caremaster-backend` → exec cwd,
  then read `DB_NAME` from that directory's `.env`. Never assume the database
  name matches the product name.
- Frontend is served by host Nginx from `/var/www/caremaster/build`.
- Login auth is delivered via an **HttpOnly cookie** (`data.token` is not in
  the email-login JSON body). `authenticateToken` accepts the cookie, a
  `Bearer` header, or a `?token=` query param.
- `users.user_type` check constraint allows `super-admin` (hyphen), NOT
  `super_admin` / `superadmin`.

## Testing

- `npm run build` — CRA production build.
- `npx react-scripts test --watchAll=false` — Jest unit tests in
  `src/__tests__/`.
- `scripts/test-messaging-call-flow.js` — API-level messaging/call flow test;
  point `BASE` at the backend port and use valid credentials. Auth flows
  through the Set-Cookie header (script handles this).
