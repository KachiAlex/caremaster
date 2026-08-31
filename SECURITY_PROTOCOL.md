# CareMaster Security Protocol & Hardening Plan

**Generated:** 2026-08-31
**Status:** Audit complete — this document outlines the current security posture, identified vulnerabilities, and a prioritized remediation plan.

---

## Executive Summary

A comprehensive security audit was conducted across three dimensions: backend, frontend, and infrastructure. The application handles **Protected Health Information (PHI)** and personally identifiable information (PII) for elderly patients, making security critical.

**Current security posture:** Basic protections are in place (Helmet, CORS whitelist, bcrypt hashing, CSP headers, rate limiting), but there are **critical gaps** in authentication, data access control, secret management, and PHI protection that must be addressed.

**Vulnerability summary:**
- 6 critical, 39 high, 22 moderate, 11 low npm vulnerabilities (78 total)
- Critical: No row-level authorization on data API (any user can read/modify any record)
- Critical: JWT tokens stored in localStorage (XSS-vulnerable)
- Critical: `.env` files with real secrets committed to repo
- Critical: No logout/token invalidation mechanism
- High: PHI stored unencrypted in database
- High: AI API keys (OpenAI, etc.) exposed in client bundle
- High: Service Worker caches API responses with PII in IndexedDB

---

## Part 1: Current Security Posture

### What's Already Implemented (Good)

| Area | Implementation | Location |
|------|---------------|----------|
| Password hashing | bcryptjs, 12 salt rounds | `backend/routes/auth.js` |
| JWT authentication | Token verification + user existence check | `backend/middleware/auth.js` |
| CORS whitelist | Only allowed origins in production | `backend/server.js:54-61` |
| Helmet middleware | HTTP security headers | `backend/server.js:26` |
| Rate limiting | Global (3000/15min) + Auth (100/15min) | `backend/server.js:30-51` |
| CSP headers | Strict CSP via Nginx (no inline scripts) | `deploy/csp_headers.conf` |
| Security headers | HSTS, X-Frame-Options, X-Content-Type-Options, etc. | `deploy/security_headers.conf` |
| HTTPS enforcement | Let's Encrypt TLS + HSTS | `deploy/elderx.conf` |
| Input sanitization | DOMPurify for HTML rendering | `src/utils/safeHTMLRenderer.js` |
| Table whitelist | ALLOWED_TABLES prevents arbitrary table access | `backend/routes/data.js:12-76` |
| Field whitelist | WRITABLE_FIELDS prevents mass-assignment | `backend/routes/data.js:131-179` |
| SQL injection prevention | Knex query builder (parameterized) | `backend/routes/data.js` |
| Password complexity | Joi validation (8+ chars, upper/lower/number/special) | `backend/middleware/validation.js` |
| Login attempt logging | login_attempts + security_audit_logs | `backend/routes/auth.js:374-395` |
| Session tracking | user_sessions table with expiry | `backend/routes/auth.js:484-498` |

### What's Missing or Weak (Gaps)

See Part 2 for details on each.

---

## Part 2: Identified Vulnerabilities (Prioritized)

### CRITICAL (Fix Immediately)

#### C1. No Row-Level Authorization on Data API
**File:** `backend/routes/data.js`
**Risk:** Any authenticated user can GET/PUT/DELETE any record in any allowed table — including other users' prescriptions, vital signs, invoices, and even the `users` table itself. There is no check that the record belongs to `req.user` or their institution.
**Impact:** Complete data breach — a patient can access all other patients' medical records, modify them, or delete them.

#### C2. JWT Tokens Stored in localStorage
**Files:** `src/backend/auth.js:17-18`, `src/contexts/UserContext.js:150`
**Risk:** JWTs are accessible to any JavaScript running on the page, including XSS payloads and malicious browser extensions. No httpOnly cookie usage exists anywhere.
**Impact:** Token theft → account takeover → PHI access.

#### C3. `.env` Files with Real Secrets Committed to Repo
**Files:** `C:\caremaster\.env`, `C:\caremaster\backend\.env`
**Risk:** Database credentials, JWT secret, Paystack keys, SMTP credentials, and Firebase config are in the repository. The JWT secret is a human-readable string, not a cryptographically random key.
**Impact:** Anyone with repo access has all secrets. If the repo is ever public or leaked, all systems are compromised.

#### C4. No Logout / Token Invalidation
**File:** `backend/routes/auth.js` (no logout endpoint)
**Risk:** JWTs are stateless and remain valid until expiry (24h/7d). There is no way to invalidate a token after logout, password change, or account suspension. The `user_sessions` table is tracked but not enforced by the auth middleware.
**Impact:** Stolen tokens remain valid even after the user logs out or changes their password.

#### C5. AI API Keys Exposed in Client Bundle
**Files:** `src/services/aiService.js`, `src/config/environment.js`
**Risk:** `REACT_APP_OPENAI_API_KEY`, `REACT_APP_GOOGLE_AI_API_KEY`, `REACT_APP_ANTHROPIC_API_KEY` are read from environment variables and embedded in the client JavaScript bundle. They are sent directly from the browser to third-party APIs.
**Impact:** Anyone can extract these keys from the browser and use them, incurring costs and potentially accessing AI-generated health data.

#### C6. knex SQL Injection Vulnerability
**Package:** knex `^3.0.1` (affected: <=3.2.8)
**Risk:** High-severity SQL injection advisory (AIKIDO-2026-10469).
**Impact:** Potential SQL injection if not patched.

### HIGH (Fix Soon)

#### H1. PHI Stored Unencrypted in Database
**Risk:** Sensitive fields (medical_conditions, medications, allergies, national_id, insurance_policy_number, date_of_birth, emergency_contact) are stored as cleartext in PostgreSQL. No pgcrypto or application-level encryption.
**Impact:** Database breach = full PHI exposure.

#### H2. Password Reset Tokens Stored in Plaintext
**File:** `backend/routes/auth.js:771-778`
**Risk:** Reset tokens are stored as-is in `users.password_reset_token`. If the DB is compromised, attackers can use these tokens to reset anyone's password.
**Impact:** Account takeover via DB breach.

#### H3. No Account Lockout After Failed Logins
**File:** `backend/routes/auth.js`
**Risk:** Failed login attempts are logged but no automatic lockout/suspension occurs. Only IP-based rate limiting (100/15min) exists.
**Impact:** Brute-force attacks against specific accounts.

#### H4. Service Worker Caches PII in IndexedDB
**File:** `public/sw.js:243-293`
**Risk:** The service worker caches API GET responses (containing PII/PHI) and queues POST/PUT/DELETE requests (with Authorization headers and request bodies) in IndexedDB.
**Impact:** Sensitive data persists on the device even after logout.

#### H5. Temporary Passwords Stored in sessionStorage
**Files:** `src/components/InstitutionUserCreationModal.js:135`, `src/components/PartnerUserCreationModal.js:160`
**Risk:** When admin creates a new user, the temporary password is stored in `sessionStorage` in plaintext.
**Impact:** Password visible to any JavaScript on the page.

#### H6. SSL Certificate Not Validated for Database
**File:** `backend/knexfile.js:29`
**Risk:** `ssl: { rejectUnauthorized: false }` — the database connection uses SSL but does not validate the server certificate, making it vulnerable to man-in-the-middle attacks.
**Impact:** MITM can intercept database traffic.

#### H7. No Firestore/Storage Security Rules
**Risk:** No `firestore.rules` or `storage.rules` files exist. Firebase security is not enforced at the database level.
**Impact:** Direct Firebase API access may bypass application-level auth.

#### H8. 2FA Disabled Globally
**File:** `backend/middleware/auth.js:62-66`
**Risk:** `require2FA` is a no-op (`// 2FA is disabled for CareMaster — pass through`). The setup/verify endpoints exist but cannot be enforced.
**Impact:** Admin/staff accounts have no second factor protection.

#### H9. `NODE_ENV=development` in Production Backend
**File:** `backend/.env:37`
**Risk:** The backend `.env` sets `NODE_ENV=development`, which may cause the development Knex config (no SSL) to be used and stack traces to be exposed.
**Impact:** Insecure DB connection + error leakage.

### MEDIUM (Fix When Possible)

#### M1. CSP `connect-src` Too Broad
**File:** `deploy/csp_headers.conf`
**Risk:** `connect-src 'self' https: ws: wss:` allows connections to ANY HTTPS/WebSocket origin.
**Impact:** Data exfiltration to arbitrary domains via XSS.

#### M2. No Per-Account Rate Limiting on Password Reset
**File:** `backend/routes/auth.js:753`
**Risk:** `/forgot-password` is only limited by the generic auth rate limiter (100/15min per IP), not per email address.
**Impact:** Email flooding / password reset token enumeration.

#### M3. Permissions-Policy Conflict
**Files:** `deploy/security_headers.conf` vs `public/index.html:46-49`
**Risk:** Nginx allows `camera=(self), microphone=(self)` but the HTML meta tag sets `camera=(), microphone=()`. This conflict may block telemedicine.
**Impact:** Telemedicine functionality may break depending on which policy wins.

#### M4. No Request Body Size Limit on Bulk Operations
**File:** `backend/routes/data.js:635-679`
**Risk:** `POST /api/data/:table/bulk` accepts an arbitrary number of records with no maximum.
**Impact:** DoS via large bulk inserts.

#### M5. 78 npm Vulnerabilities (6 critical, 39 high)
**Risk:** Known vulnerabilities in dependencies including xlsx (prototype pollution, ReDoS), ws (memory exhaustion DoS), yaml (stack overflow).
**Impact:** Various attacks depending on the vulnerability.

#### M6. No `server_tokens off` in Nginx
**File:** `deploy/elderx.conf`
**Risk:** Nginx version is exposed in response headers.
**Impact:** Attackers can target known Nginx vulnerabilities.

#### M7. Hardcoded Fallback Credentials
**Files:** `src/services/agoraTokenService.js:9`, `src/backend/storage.js:8-9`
**Risk:** Agora App ID and Cloudinary cloud name/preset are hardcoded as fallbacks in source code.
**Impact:** Account information exposed in client bundle.

### LOW (Nice to Have)

#### L1. Deprecated X-XSS-Protection Header
**File:** `deploy/security_headers.conf`
**Risk:** `X-XSS-Protection` is deprecated; CSP is the modern replacement.

#### L2. Redundant Token Storage
**File:** `src/backend/auth.js:17-18`
**Risk:** JWT is stored under both `token` and `authToken` keys in localStorage.

#### L3. No `frame-ancestors` in CSP
**File:** `deploy/csp_headers.conf`
**Risk:** Modern CSP replacement for X-Frame-Options is missing.

---

## Part 3: Security Protocol — Remediation Plan

### Phase 1: Critical Fixes (Week 1)

#### 1.1 Row-Level Authorization (C1)
**Goal:** Users can only access their own data; admins can access their institution's data.

**Implementation:**
```
backend/middleware/authorization.js (NEW)
```
- Create an authorization middleware that scopes all data queries by:
  - `patient`/`client`/`elderly` → only records where `patient_id = req.user.id`
  - `caregiver`/`nurse` → only records for assigned clients
  - `doctor` → only records for their patients
  - `admin` → only records for their institution
  - `superadmin` → all records
- Remove `users`, `login_attempts`, `user_sessions`, `security_audit_logs`, `wallets` from `ALLOWED_TABLES` — these must only be accessible via dedicated admin routes with role checks.
- Add `institution_id` filtering for admin/superadmin queries.
- Enforce ownership on PUT/DELETE: check the record belongs to the user before modifying.

#### 1.2 Move JWT to httpOnly Cookies (C2)
**Goal:** Tokens are not accessible to JavaScript.

**Implementation:**
- Backend: On login, set JWT in an `httpOnly`, `Secure`, `SameSite=Strict` cookie instead of returning it in the response body.
- Backend: Add CSRF protection (double-submit cookie or SameSite=Strict).
- Frontend: Remove all `localStorage.setItem('token', ...)` calls. Use `credentials: 'include'` on all fetch requests.
- Frontend: Remove `Authorization: Bearer` headers — the cookie is sent automatically.
- Backend: Add `/logout` endpoint that clears the cookie.

#### 1.3 Remove `.env` from Repo & Rotate Secrets (C3)
**Goal:** Secrets are never in version control.

**Implementation:**
- Add `.env` and `backend/.env` to `.gitignore` (if not already).
- Remove `.env` files from git history using `git filter-branch` or BFG Repo-Cleaner.
- Generate a new `JWT_SECRET`: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`.
- Rotate ALL secrets: JWT, database password, Paystack, SMTP/Brevo, Firebase, Cloudinary, Agora.
- Store secrets in a secret manager (e.g., Doppler, AWS Secrets Manager, or at minimum a secured `.env` on the server that is never committed).
- Keep only `.env.example` in the repo with placeholder values.

#### 1.4 Add Logout & Token Invalidation (C4)
**Goal:** Tokens can be invalidated.

**Implementation:**
- Add `POST /api/auth/logout` endpoint that:
  - Marks the `user_sessions` row as `active: false`
  - Clears the httpOnly cookie
  - Adds the JWT to a deny-list (Redis or a `revoked_tokens` table) for the remaining TTL
- Update `authenticateToken` middleware to check:
  - The `user_sessions` row is still `active: true`
  - The token is not in the revoked_tokens deny-list
- On password change/reset, invalidate all sessions for that user.

#### 1.5 Move AI API Keys to Backend (C5)
**Goal:** No API keys in the client bundle.

**Implementation:**
- Create `backend/routes/ai.js` — a proxy endpoint that:
  - Accepts the prompt/request from the frontend
  - Adds the API key server-side
  - Forwards to OpenAI/Google/Anthropic
  - Returns the response
- Frontend: Change all `aiService.js` calls to hit `/api/ai/...` instead of calling OpenAI directly.
- Remove all `REACT_APP_OPENAI_API_KEY`, `REACT_APP_GOOGLE_AI_KEY`, `REACT_APP_ANTHROPIC_API_KEY` from environment.
- Remove `REACT_APP_JWT_SECRET` and `REACT_APP_ENCRYPTION_KEY` from client entirely.

#### 1.6 Upgrade knex (C6)
```bash
cd backend && npm install knex@latest
```

### Phase 2: High-Priority Fixes (Week 2-3)

#### 2.1 Encrypt PHI at Rest (H1)
**Goal:** Sensitive health data is encrypted in the database.

**Implementation:**
- Use PostgreSQL `pgcrypto` extension: `CREATE EXTENSION IF NOT EXISTS pgcrypto;`
- Create encryption helper in backend:
  ```js
  // backend/utils/encryption.js
  const crypto = require('crypto');
  const KEY = Buffer.from(process.env.PHI_ENCRYPTION_KEY, 'hex'); // 32-byte key

  function encrypt(text) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
    const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  function decrypt(data) {
    const [ivHex, tagHex, encHex] = data.split(':');
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    return decipher.update(Buffer.from(encHex, 'hex')) + decipher.final('utf8');
  }
  ```
- Apply to columns: `medical_conditions`, `medications`, `allergies`, `national_id`, `insurance_policy_number`, `date_of_birth`, `emergency_contact_phone`, `emergency_contact_name`, `results` (lab tests), `notes` (care logs).
- Encrypt on POST/PUT, decrypt on GET (after authorization check).

#### 2.2 Hash Password Reset Tokens (H2)
**Goal:** Reset tokens are hashed in the database.

**Implementation:**
- In `/forgot-password`: store `crypto.createHash('sha256').update(token).digest('hex')` instead of the raw token.
- In `/reset-password`: hash the incoming token the same way and compare.
- Make tokens single-use (clear after successful reset — already done).
- Reduce expiry to 30 minutes (from 1 hour).

#### 2.3 Account Lockout (H3)
**Goal:** Accounts are temporarily locked after repeated failed logins.

**Implementation:**
- After 5 failed attempts within 15 minutes, lock the account for 30 minutes.
- Store lockout state in `users` table: `locked_until TIMESTAMP`.
- Check `locked_until` in login endpoint before attempting password comparison.
- Unlock automatically after the lockout period.
- Notify the user via email when their account is locked.
- Admin can manually unlock via admin dashboard.

#### 2.4 Harden Service Worker (H4)
**Goal:** No PII/PHI cached in IndexedDB.

**Implementation:**
- Remove `/api/*` from the service worker cache allowlist.
- Do not cache any API GET responses — only cache static assets (JS, CSS, images, fonts).
- Remove the offline queue for POST/PUT/DELETE requests, OR strip Authorization headers and request bodies before storing.
- Clear all existing caches on SW update (already done via cache version bump).

#### 2.5 Remove Temporary Passwords from sessionStorage (H5)
**Goal:** No passwords in browser storage.

**Implementation:**
- Instead of storing the temp password in sessionStorage, send it to the new user's email directly from the backend.
- Display a success message to the admin: "Account created. A temporary password has been emailed to the user."
- Remove all `sessionStorage.setItem('tempPassword_...')` calls.

#### 2.6 Fix Database SSL (H6)
**Goal:** Database connection validates the server certificate.

**Implementation:**
- In `knexfile.js` production config:
  ```js
  ssl: {
    rejectUnauthorized: true,
    ca: fs.readFileSync('/path/to/postgres-ca.pem').toString(),
  }
  ```
- Set `NODE_ENV=production` in the server's `.env`.

#### 2.7 Create Firestore Security Rules (H7)
**Goal:** Firebase access is restricted at the database level.

**Implementation:**
- Create `firestore.rules`:
  ```
  rules_version = '2';
  service cloud.firestore {
    match /databases/{database}/documents {
      // Users can only read/write their own document
      match /users/{userId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
      // Conversations: only participants can read/write
      match /conversations/{convId} {
        allow read, write: if request.auth != null &&
          request.auth.uid in resource.data.participants;
      }
      // Messages: only if user is a participant of the conversation
      match /messages/{messageId} {
        allow read, write: if request.auth != null;
        // Additional check: verify user is participant in parent conversation
      }
      // Deny everything else by default
      match /{document=**} {
        allow read, write: if false;
      }
    }
  }
  ```
- Create `storage.rules` similarly.
- Deploy: `firebase deploy --only firestore:rules,storage:rules`

#### 2.8 Re-enable 2FA for Admin/Staff (H8)
**Goal:** Admin and staff accounts require TOTP verification.

**Implementation:**
- Re-enable `require2FA` middleware for admin/staff routes.
- On login, if `two_factor_enabled === true`, return a partial token (no data access).
- Frontend shows TOTP input → calls `/verify-2fa` → gets full JWT.
- Enforce 2FA for all `admin`, `superadmin`, `doctor` accounts.

#### 2.9 Fix NODE_ENV (H9)
- Set `NODE_ENV=production` in the server's `.env`.
- Set `REACT_APP_DEBUG_MODE=false`.

### Phase 3: Medium-Priority Fixes (Week 3-4)

#### 3.1 Tighten CSP
**File:** `deploy/csp_headers.conf`
```
connect-src 'self' https://api.getcaremaster.com https://www.googleapis.com https://securetoken.googleapis.com wss://getcaremaster.com;
img-src 'self' data: https://res.cloudinary.com https://getcaremaster.com;
```
- Add `frame-ancestors 'none'` to CSP.
- Remove deprecated `X-XSS-Protection` header.

#### 3.2 Per-Account Rate Limiting on Password Reset
- In `/forgot-password`, check `login_attempts` for the email address.
- Limit to 3 reset requests per hour per email.

#### 3.3 Fix Permissions-Policy Conflict
- Remove the `Permissions-Policy` meta tag from `public/index.html`.
- Rely on the Nginx header only (which correctly allows camera/microphone for telemedicine).

#### 3.4 Bulk Operation Limits
- In `data.js` bulk endpoint, cap at 100 records per request.
- Add Joi validation for bulk record fields.

#### 3.5 Fix npm Vulnerabilities
```bash
npm audit fix
npm install xlsx@latest  # or replace with alternative
cd backend && npm install knex@latest express@latest
```
- Remove the `crypto` npm package (use Node.js built-in `crypto`).
- Consider migrating from `react-scripts` to Vite for fewer transitive dependencies.

#### 3.6 Nginx Hardening
**File:** `deploy/elderx.conf`
- Add `server_tokens off;`
- Add `client_max_body_size 10m;`
- Add `limit_req_zone` for API rate limiting at Nginx level.
- Change port 80 block to unconditional `return 301 https://$host$request_uri;`

#### 3.7 Remove Hardcoded Fallbacks
- Remove hardcoded Agora App ID from `agoraTokenService.js`.
- Remove hardcoded Cloudinary cloud name/preset from `storage.js`.
- Fail gracefully if env vars are missing instead of falling back to real values.

### Phase 4: Ongoing Security Practices

#### 4.1 Audit Logging
- Log all access to PHI (who accessed what record, when).
- Log all admin actions (user creation, role changes, data exports).
- Store audit logs in a separate, append-only table.
- Retain for minimum 6 years (HIPAA requirement).

#### 4.2 Dependency Management
- Run `npm audit` weekly in CI.
- Use Dependabot or Renovate for automated PRs.
- Pin exact versions and use `npm ci` in production.
- Review new dependencies before adding.

#### 4.3 Regular Security Reviews
- Quarterly security audits.
- Penetration testing before major releases.
- Code review checklist for security (input validation, auth checks, no secrets).

#### 4.4 Incident Response Plan
- Define what constitutes a security incident.
- Establish a response team and escalation path.
- Create templates for: breach notification, user communication, post-mortem.
- Test the plan annually.

#### 4.5 Compliance
- HIPAA: Business Associate Agreements with all third parties (Firebase, Cloudinary, Agora, OpenAI).
- GDPR: Data retention policy, right to erasure, data portability.
- Regular compliance audits.

#### 4.6 Infrastructure Hardening
- Install fail2ban on the VPS.
- Configure UFW firewall: only allow 22 (SSH), 80, 443.
- Set up SSH key-only authentication (disable password login).
- Enable automatic security updates.
- Consider a WAF (Cloudflare WAF or ModSecurity).

#### 4.7 Monitoring & Alerting
- Set up application monitoring (PM2 monitoring, or Datadog/New Relic).
- Alert on: unusual login patterns, mass data access, rate limit violations, error spikes.
- Monitor for brute-force attempts on auth endpoints.

---

## Part 4: Security Checklist

Use this checklist to track remediation progress:

### Critical
- [ ] C1: Add row-level authorization to data.js
- [ ] C2: Move JWT to httpOnly cookies
- [ ] C3: Remove .env from repo, rotate all secrets
- [ ] C4: Add logout endpoint + token invalidation
- [ ] C5: Move AI API keys to backend proxy
- [ ] C6: Upgrade knex to >=3.2.9

### High
- [ ] H1: Encrypt PHI at rest (pgcrypto)
- [ ] H2: Hash password reset tokens
- [ ] H3: Add account lockout after failed logins
- [ ] H4: Harden service worker (no API caching)
- [ ] H5: Remove temp passwords from sessionStorage
- [ ] H6: Fix database SSL certificate validation
- [ ] H7: Create and deploy Firestore security rules
- [ ] H8: Re-enable 2FA for admin/staff
- [ ] H9: Set NODE_ENV=production

### Medium
- [ ] M1: Tighten CSP connect-src
- [ ] M2: Per-account rate limiting on password reset
- [ ] M3: Fix Permissions-Policy conflict
- [ ] M4: Cap bulk operation size
- [ ] M5: Fix npm vulnerabilities (78 total)
- [ ] M6: Add server_tokens off in Nginx
- [ ] M7: Remove hardcoded fallback credentials

### Low
- [ ] L1: Remove deprecated X-XSS-Protection header
- [ ] L2: Remove redundant authToken localStorage key
- [ ] L3: Add frame-ancestors to CSP

### Ongoing
- [ ] Set up audit logging for PHI access
- [ ] Configure dependency scanning in CI
- [ ] Install fail2ban + UFW firewall on VPS
- [ ] Set up monitoring & alerting
- [ ] Create incident response plan
- [ ] Quarterly security audits

---

## Part 5: Architecture Recommendations

### Token Architecture (Target State)
```
Login Flow:
  1. User submits credentials
  2. Backend validates → creates access token (15min) + refresh token (7d)
  3. Access token → httpOnly, Secure, SameSite=Strict cookie
  4. Refresh token → httpOnly, Secure, SameSite=Strict, Path=/api/auth/refresh cookie
  5. Frontend uses credentials: 'include' — no token in JS

API Request:
  1. Browser sends cookie automatically
  2. Backend reads cookie → verifies JWT → checks session active
  3. Authorization middleware scopes query by user role + institution

Token Refresh:
  1. Access token expires (15min)
  2. Frontend gets 401 → calls /api/auth/refresh
  3. Backend validates refresh token → issues new access token
  4. Refresh token rotation: old refresh token invalidated

Logout:
  1. POST /api/auth/logout
  2. Backend: session.active = false, add tokens to deny-list
  3. Clear both cookies
```

### Data Access Architecture (Target State)
```
Patient/Client:
  → GET /api/data/vital_signs?clientId=ME → only my vital signs
  → GET /api/data/prescriptions?clientId=ME → only my prescriptions
  → Cannot access other patients' data

Caregiver:
  → GET /api/data/vital_signs → only for assigned clients
  → POST /api/data/care_logs → only for assigned clients

Doctor:
  → GET /api/data/prescriptions → only for their patients
  → POST /api/data/prescriptions → only for their patients

Admin:
  → GET /api/data/* → only for their institution
  → Cannot access other institutions' data

Superadmin:
  → GET /api/data/* → all data (with audit logging)
```

---

*This document should be reviewed and updated quarterly or after any significant security incident.*
