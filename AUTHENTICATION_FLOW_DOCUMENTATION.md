# Authentication Flow Documentation

**Status:** ✅ **COMPREHENSIVE**  
**Last Updated:** 12/1/2025

---

## Overview

This document describes the complete authentication flow implementation in the ElderX healthcare platform, including security measures, error handling, and user flows.

---

## Authentication Architecture

### Components

1. **AuthSecurityService** (`src/services/authSecurityService.js`)
   - Core authentication service with security measures
   - Session management
   - Rate limiting integration
   - Password validation
   - 2FA support

2. **UnifiedLogin** (`src/pages/UnifiedLogin.js`)
   - Unified login page for all user types
   - Firebase Auth + Custom Auth fallback
   - Rate limiting integration
   - Secure password verification

3. **InstitutionLogin** (`src/pages/InstitutionLogin.js`)
   - Institution-specific login (admins, caregivers, pharmacists)
   - Custom authentication with Firebase Auth fallback
   - Rate limiting integration
   - Password reset functionality

4. **Rate Limiter** (`src/utils/rateLimiter.js`)
   - Brute force protection
   - Account lockout mechanism
   - Automatic cleanup

---

## Authentication Flows

### 1. User Registration Flow

**Path:** `AuthSecurityService.secureSignUp()`

**Steps:**
1. Validate email format
2. Validate password strength (min 8 chars, uppercase, lowercase, number, special char)
3. Create user with Firebase Auth
4. Encrypt sensitive user data
5. Create session
6. Log registration event

**Error Handling:**
- `auth/email-already-in-use` → "This email address is already registered."
- `auth/invalid-email` → "Please enter a valid email address."
- `auth/weak-password` → "Password is too weak. Please choose a stronger password."
- `auth/operation-not-allowed` → "This operation is not allowed. Please contact support."

**Security Measures:**
- ✅ Password strength validation
- ✅ Email format validation
- ✅ Data encryption for sensitive fields
- ✅ Comprehensive logging

---

### 2. User Login Flow

**Path:** `AuthSecurityService.secureSignIn()` or `UnifiedLogin.handleSubmit()`

**Steps:**
1. Check rate limit (prevent brute force)
2. Check if account is locked
3. Attempt Firebase Auth login
4. If Firebase Auth fails, try custom auth (for admin-created users)
5. Verify password securely (PBKDF2)
6. Create secure session
7. Set session timeout
8. Reset rate limit on success

**Error Handling:**
- `auth/user-not-found` → "No account found with this email address."
- `auth/wrong-password` → "Incorrect password. Please try again."
- `auth/too-many-requests` → "Too many failed attempts. Please try again later."
- `auth/user-disabled` → "This account has been disabled. Please contact support."
- Account locked → "Account is temporarily locked due to multiple failed attempts."

**Security Measures:**
- ✅ Rate limiting (5 attempts per 15 minutes)
- ✅ Account lockout (30 minutes after 5 failed attempts)
- ✅ Secure password verification (PBKDF2)
- ✅ Session management with timeout
- ✅ IP address tracking
- ✅ User agent tracking
- ✅ Comprehensive logging

---

### 3. Password Reset Flow

**Path:** `AuthSecurityService.securePasswordReset()` or `InstitutionLogin` reset modal

**Steps:**
1. Validate email format
2. Check if user exists
3. Send password reset email via Firebase
4. User receives email with reset link
5. User clicks link and sets new password
6. Log password reset event

**Error Handling:**
- `auth/user-not-found` → "No account found with that email address."
- `auth/invalid-email` → "Invalid email address."
- Network error → "Please check your internet connection and try again."

**Security Measures:**
- ✅ Email validation
- ✅ Firebase-managed reset links (secure tokens)
- ✅ Comprehensive logging

---

### 4. Password Change Flow

**Path:** `AuthSecurityService.securePasswordChange()`

**Steps:**
1. Verify current password (re-authentication)
2. Validate new password strength
3. Update password via Firebase Auth
4. Log password change event

**Error Handling:**
- `auth/wrong-password` → "Current password is incorrect."
- `auth/requires-recent-login` → "Please log out and log back in to perform this action."
- `auth/weak-password` → "Password is too weak. Please choose a stronger password."

**Security Measures:**
- ✅ Re-authentication required
- ✅ Password strength validation
- ✅ Comprehensive logging

---

### 5. Session Management Flow

**Path:** `AuthSecurityService` session methods

**Session Lifecycle:**
1. **Creation:** On successful login
   - Generate session ID
   - Store session data (userId, email, loginTime, IP, userAgent)
   - Set session timeout

2. **Validation:** On each authenticated request
   - Check if session exists
   - Check if session expired
   - Update last activity time

3. **Expiration:** Automatic timeout
   - Default: 8 hours (configurable)
   - Warning: 5 minutes before expiration
   - Auto sign-out on expiration

4. **Invalidation:** On logout
   - Clear session data
   - Clear timeout
   - Log logout event

**Security Measures:**
- ✅ Session timeout enforcement
- ✅ Session validation on requests
- ✅ Automatic cleanup of expired sessions
- ✅ Session expiration warnings

---

## Security Features

### 1. Rate Limiting

**Implementation:** `src/utils/rateLimiter.js`

**Configuration:**
- Max attempts: 5 per 15-minute window
- Lockout duration: 30 minutes
- Automatic cleanup of expired records

**Protection:**
- ✅ Prevents brute force attacks
- ✅ Account lockout after failed attempts
- ✅ Automatic reset on successful login

---

### 2. Account Lockout

**Implementation:** Integrated with rate limiter

**Behavior:**
- Locks account after 5 failed login attempts
- 30-minute lockout period
- Automatic unlock after lockout expires
- Clear error messages with lockout duration

---

### 3. Password Security

**Hashing Algorithm:** PBKDF2 with SHA-256
- Iterations: 100,000
- Salt: 128-bit random salt
- Format: `salt:hash`

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Validation:**
- Client-side validation on registration
- Server-side validation via Firebase Auth
- Re-authentication required for password changes

---

### 4. Session Security

**Session Data:**
- Session ID (secure random token)
- User ID
- Email
- Login time
- Last activity time
- IP address
- User agent

**Session Timeout:**
- Default: 8 hours (configurable)
- Warning: 5 minutes before expiration
- Auto sign-out on expiration

**Session Validation:**
- Validated on each authenticated request
- Checks session existence
- Checks session expiration
- Updates last activity time

---

### 5. Error Handling

**Comprehensive Error Messages:**
- Specific messages for each error code
- User-friendly language
- Actionable guidance
- No sensitive information leakage

**Error Logging:**
- All authentication attempts logged
- Failed attempts tracked
- Security events logged
- Error context sanitized

---

## Custom Authentication (Admin-Created Users)

**Purpose:** Support for users created by admins without Firebase Auth accounts

**Flow:**
1. Admin creates user in Firestore with hashed password
2. User attempts login via UnifiedLogin
3. Firebase Auth attempted first
4. If Firebase Auth fails, custom auth attempted
5. Password verified using PBKDF2
6. Session created if password matches

**Security:**
- ✅ Passwords hashed with PBKDF2
- ✅ Secure password verification
- ✅ Rate limiting applied
- ✅ Account lockout enforced

---

## Two-Factor Authentication (2FA)

**Status:** Implemented but optional

**Setup Flow:**
1. User enables 2FA in settings
2. Phone number verified
3. Verification code sent
4. Code verified and 2FA enabled

**Login Flow:**
1. User enters email and password
2. If 2FA enabled, verification code required
3. Code verified
4. Session created

**Implementation:** `AuthSecurityService.setupTwoFactorAuth()`

---

## Testing

### Unit Tests
- ✅ Authentication service tests
- ✅ Password validation tests
- ✅ Email validation tests
- ✅ Session management tests
- ✅ Error handling tests

### Integration Tests
- ✅ Login flow tests
- ✅ Registration flow tests
- ✅ Password reset tests
- ✅ Session management tests

### Security Tests
- ✅ Rate limiting tests
- ✅ Account lockout tests
- ✅ Brute force protection tests
- ✅ Session timeout tests

---

## Configuration

### Environment Variables

```bash
# Optional: Custom session timeout (seconds)
REACT_APP_SESSION_TIMEOUT=28800  # 8 hours

# Optional: Max login attempts
REACT_APP_MAX_LOGIN_ATTEMPTS=5

# Optional: Lockout duration (seconds)
REACT_APP_LOCKOUT_DURATION=1800  # 30 minutes
```

### Secure Config Service

```javascript
// Session timeout (seconds)
secureConfigService.set('security.sessionTimeout', 28800);

// Max login attempts
secureConfigService.set('security.maxLoginAttempts', 5);

// Lockout duration (seconds)
secureConfigService.set('security.lockoutDuration', 1800);
```

---

## Best Practices

### For Developers

1. **Always use AuthSecurityService methods** instead of Firebase Auth directly
2. **Handle errors gracefully** with user-friendly messages
3. **Log authentication events** for security monitoring
4. **Validate inputs** before authentication attempts
5. **Respect rate limits** in UI (show appropriate messages)

### For Security

1. **Monitor authentication logs** for suspicious activity
2. **Review failed login attempts** regularly
3. **Rotate encryption keys** periodically
4. **Keep dependencies updated** (Firebase SDK, etc.)
5. **Test authentication flows** regularly

---

## Troubleshooting

### Common Issues

**Issue:** "Account is temporarily locked"
- **Cause:** Too many failed login attempts
- **Solution:** Wait 30 minutes or contact admin

**Issue:** "Session expired"
- **Cause:** Session timeout exceeded
- **Solution:** Log in again

**Issue:** "Password reset email not received"
- **Cause:** Email may be in spam, or user not found
- **Solution:** Check spam folder, verify email address

**Issue:** "Invalid email or password"
- **Cause:** Wrong credentials or account doesn't exist
- **Solution:** Verify credentials, check account status

---

## Migration Notes

### From Plain Text to Secure Passwords

1. Existing users with plain text passwords are automatically migrated
2. On first login, password is verified and re-hashed
3. New hash stored in Firestore
4. Old plain text password removed

**Implementation:** `src/utils/securePasswordAuth.js`

---

## Files Reference

- `src/services/authSecurityService.js` - Core authentication service
- `src/pages/UnifiedLogin.js` - Unified login page
- `src/pages/InstitutionLogin.js` - Institution login page
- `src/utils/rateLimiter.js` - Rate limiting utility
- `src/utils/securePasswordAuth.js` - Secure password hashing
- `src/utils/errorHandler.js` - Error handling
- `src/__tests__/services/authSecurityService.test.js` - Authentication tests

---

## Summary

✅ **Comprehensive authentication flow implemented**
- Secure user registration
- Secure user login (Firebase Auth + Custom Auth)
- Password reset functionality
- Password change with re-authentication
- Session management with timeout
- Rate limiting and account lockout
- 2FA support (optional)
- Comprehensive error handling
- Extensive logging and monitoring

**Security Impact:**
- 🔒 Brute force protection
- 🔒 Account lockout mechanism
- 🔒 Secure password hashing (PBKDF2)
- 🔒 Session management with timeout
- 🔒 Comprehensive error handling
- 🔒 Extensive logging

---

**Last Updated:** 12/1/2025

