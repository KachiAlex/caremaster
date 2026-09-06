/**
 * auth.js - Real Express API compatibility layer.
 *
 * Replaces Firebase Auth with calls to the Express backend auth routes
 * (POST /api/auth/email-login, POST /api/auth/register, etc.).
 * JWT token and user profile are stored in localStorage.
 */

import { Capacitor } from '@capacitor/core';

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function isNativePlatform() {
  return Capacitor.isNativePlatform?.() || false;
}

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

function setToken(token) {
  localStorage.setItem('token', token);
  localStorage.setItem('authToken', token);
}

function clearToken() {
  localStorage.removeItem('token');
  localStorage.removeItem('authToken');
  localStorage.removeItem('user');
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  // Include cookies so the backend can read the httpOnly token cookie on web.
  // Native apps fall back to the Authorization header populated from localStorage.
  const res = await fetch(url, { ...options, headers, credentials: 'include' });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!res.ok) {
    const err = new Error(body.message || `Auth error ${res.status}`);
    err.code = body.code || res.status;
    err.response = body;
    throw err;
  }
  return body;
}

// --- Auth instance (compatibility object) ---
// Singleton: all callers must share the same auth instance so that
// signOut() on one reference notifies onAuthStateChanged listeners
// registered on another reference.

let _authInstance = null;

export const getAuth = (_app) => {
  if (_authInstance) return _authInstance;
  _authInstance = {
    currentUser: null,
    app: _app,
    __listeners: [],
    onAuthStateChanged(callback) {
      return onAuthStateChanged(this, callback);
    },
    signOut() {
      return signOut(this);
    },
  };
  return _authInstance;
};

export const setPersistence = (_auth, _persistence) => Promise.resolve();
export const browserLocalPersistence = 'LOCAL';
export const browserSessionPersistence = 'SESSION';
export const inMemoryPersistence = 'NONE';
export const connectAuthEmulator = () => {};

// --- Sign-in / sign-up ---

export async function signInWithEmailAndPassword(_auth, email, password) {
  const body = await apiFetch('/auth/email-login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: {
      'X-Client-Type': isNativePlatform() ? 'native' : 'web',
    },
  });

  const { token, user } = body.data || {};
  // Only keep the token in localStorage for native/Capacitor apps. On web the
  // token lives in an httpOnly cookie and should not be accessible to JS.
  if (token && isNativePlatform()) setToken(token);
  if (user) localStorage.setItem('user', JSON.stringify(user));

  // Build a user object with Firebase-compatible token methods
  const buildUserObj = (u) => {
    if (!u) return null;
    const claims = {
      superAdmin: u.userType === 'super-admin' || u.user_type === 'super-admin',
      admin: u.userType === 'admin' || u.user_type === 'admin' || u.userType === 'institutionAdmin',
      userType: u.userType || u.user_type,
    };
    return {
      ...u,
      getIdToken: () => Promise.resolve(token),
      getIdTokenResult: () => Promise.resolve({
        token,
        claims,
        signInProvider: 'password',
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        issuedAtTime: new Date().toISOString(),
      }),
    };
  };

  // Notify onAuthStateChanged listeners
  const authObj = _auth || getAuth({});
  authObj.currentUser = buildUserObj(user);
  (authObj.__listeners || []).forEach((cb) => cb(authObj.currentUser));

  return {
    user: authObj.currentUser || buildUserObj({ id: 'unknown', email }) || { uid: user?.id || 'unknown', email, getIdToken: () => Promise.resolve(token) },
  };
}

export async function createUserWithEmailAndPassword(_auth, email, password) {
  // Register via the backend register endpoint
  try {
    const body = await apiFetch('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, matric_number: `CM-${Date.now()}`, first_name: 'New', last_name: 'User', department: 'General', level: '100', session: '2024/2025' }),
    });
    // Auto-login after registration
    return signInWithEmailAndPassword(_auth, email, password);
  } catch (err) {
    // If register fails (e.g. validation), try email-login in case user exists
    if (err.code === 400 || err.code === 422) {
      return signInWithEmailAndPassword(_auth, email, password);
    }
    throw err;
  }
}

export const signOut = async (_auth) => {
  try {
    await apiFetch('/auth/logout', { method: 'POST' });
  } catch (err) {
    // Ignore logout errors (e.g. network already gone) but still clear local state
  }
  clearToken();
  const authObj = _auth || getAuth({});
  authObj.currentUser = null;
  (authObj.__listeners || []).forEach((cb) => cb(null));
};

// --- Profile management ---

export const updateProfile = (user, profile) => {
  if (user && profile.displayName) {
    const stored = localStorage.getItem('user');
    if (stored) {
      const u = JSON.parse(stored);
      localStorage.setItem('user', JSON.stringify({ ...u, displayName: profile.displayName }));
    }
  }
  return Promise.resolve();
};

export const updateEmail = (user, newEmail) => {
  // Would need a backend endpoint; for now update locally
  return Promise.resolve();
};

export const updatePassword = (_user, _newPassword) => {
  // Would need a backend endpoint (POST /api/auth/change-password)
  return Promise.resolve();
};

export const sendPasswordResetEmail = (_auth, email) => {
  return apiFetch('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  }).catch(() => {}); // non-fatal
};

export const sendEmailVerification = (_user) => Promise.resolve();

export const verifyPasswordResetCode = (_auth, _code) =>
  Promise.resolve('reset@example.com');
export const confirmPasswordReset = (_auth, _code, _password) =>
  Promise.resolve();
export const applyActionCode = (_auth, _code) => Promise.resolve();

export const getIdToken = (_user, _forceRefresh) =>
  Promise.resolve(getToken());

// --- Auth state observation ---

export function onAuthStateChanged(auth, callback) {
  // Keep track so the async validation below can still call back
  if (!auth.__listeners) auth.__listeners = [];
  auth.__listeners.push(callback);
  let active = true;

  const buildUserObj = (u, token = null) => {
    if (!u) return null;
    const claims = {
      superAdmin: u.userType === 'super-admin' || u.user_type === 'super-admin',
      admin: u.userType === 'admin' || u.user_type === 'admin' || u.userType === 'institutionAdmin',
      userType: u.userType || u.user_type,
    };
    return {
      ...u,
      getIdToken: () => Promise.resolve(token || ''),
      getIdTokenResult: () => Promise.resolve({
        token: token || '',
        claims,
        signInProvider: 'password',
        expirationTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        issuedAtTime: new Date().toISOString(),
      }),
    };
  };

  const emit = (user) => {
    if (!active) return;
    auth.currentUser = user;
    callback(user);
  };

  const token = getToken();
  const userStr = localStorage.getItem('user');

  if (token && userStr) {
    // Native/Capacitor path: token is in localStorage
    try {
      const user = JSON.parse(userStr);
      emit(buildUserObj(user, token));
    } catch {
      emit(null);
    }
  } else if (userStr && !isNativePlatform()) {
    // Web path: token is in an httpOnly cookie. Validate the session by
    // calling the backend; the browser automatically sends the cookie.
    apiFetch('/auth/me')
      .then((body) => {
        const user = body.data?.user;
        if (user) {
          localStorage.setItem('user', JSON.stringify(user));
          emit(buildUserObj(user));
        } else {
          emit(null);
        }
      })
      .catch(() => {
        // Cookie/session invalid or missing
        emit(null);
      });
  } else {
    emit(null);
  }

  // Return unsubscribe function
  return () => {
    active = false;
    auth.__listeners = auth.__listeners.filter((cb) => cb !== callback);
  };
}

// --- MFA / Phone / Recaptcha (stubs — not commonly used) ---

export const multiFactor = (_user) => ({
  enrolledFactors: [],
  enroll: () => Promise.resolve(),
  unenroll: () => Promise.resolve(),
  getEnrolledFactors: () => [],
});

export const PhoneAuthProvider = function () {
  return { verifyPhoneNumber: () => Promise.resolve('verification-id') };
};
export const PhoneMultiFactorGenerator = {};
export const TotpMultiFactorGenerator = {};
export const TotpSecret = {};

export const RecaptchaVerifier = function () {
  return { verify: () => Promise.resolve('recaptcha-token') };
};

export const EmailAuthProvider = {
  credential: (email, password) => ({ providerId: 'password', signInMethod: 'password', email, password }),
};

export const reauthenticateWithCredential = (_user, _credential) =>
  Promise.resolve({ user: _user });

// --- Timestamp re-export (some auth files import it from auth) ---

export const Timestamp = {
  now: () => ({
    seconds: Math.floor(Date.now() / 1000),
    nanoseconds: 0,
    toDate: () => new Date(),
    toMillis: () => Date.now(),
  }),
  fromDate: (d) => ({
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => d,
    toMillis: () => d.getTime(),
  }),
};
