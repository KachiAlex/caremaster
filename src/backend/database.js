/**
 * database.js - Real Express API compatibility layer.
 *
 * Replaces the Firebase Firestore SDK with calls to the Express backend
 * (GET/POST/PUT/DELETE /api/data/:table). Consuming files import the same
 * function names (collection, doc, getDocs, getDoc, setDoc, etc.) and get
 * real API behaviour instead of stubs.
 */

// --- HTTP helper ---

import { onAuthExpired } from '../utils/authEvents';
import { offlineCache } from '../services/offlineCacheService';
import { sseService } from '../services/sseService';

const API_BASE = () =>
  process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

async function apiFetch(path, options = {}) {
  const url = `${API_BASE()}${path}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(url, { ...options, headers, credentials: 'include' });
  } catch (networkError) {
    // Network failures (offline, timeout, etc.) should not clear auth state.
    const err = new Error('Network unavailable. Please check your connection and try again.');
    err.code = 'network-error';
    throw err;
  }

  if (res.status === 401 || res.status === 403) {
    // Clear stored credentials and let the application layer handle navigation
    // so that background API calls don't force a full page reload.
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');

    onAuthExpired();

    // Fallback: if no handler is registered, redirect to login
    if (!window.location.pathname.startsWith('/login')) {
      window.location.href = '/login';
    }
  }

  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!res.ok) {
    const err = new Error(body.message || `API error ${res.status}`);
    err.code = body.code || res.status;
    err.response = body;
    throw err;
  }
  return body;
}

// --- Query constraint objects (same shape as Firebase SDK) ---

export const where = (field, op, value) => ({ type: 'where', field, op, value });
export const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
export const limit = (n) => ({ type: 'limit', value: n });
export const startAt = (...values) => ({ type: 'startAt', values });
export const startAfter = (...values) => ({ type: 'startAfter', values });
export const endAt = (...values) => ({ type: 'endAt', values });
export const endBefore = (...values) => ({ type: 'endBefore', values });

// --- Reference builders ---

export const getFirestore = (_app) => ({ __type: 'firestore' });
export const connectFirestoreEmulator = () => {};

export function collection(_db, path, ...segments) {
  if (segments.length) {
    const parts = [path];
    for (let i = 0; i < segments.length; i += 2) {
      parts.push(segments[i]);
    }
    return { __type: 'collection', path: parts.join('_') };
  }
  return { __type: 'collection', path };
}

export function doc(_db, path, id, ...segments) {
  if (segments.length) {
    const subPath = segments[0];
    const subId = segments[1];
    return { __type: 'doc', collection: `${path}_${subPath}`, id: subId, parentId: id, parentCollection: path };
  }
  return { __type: 'doc', collection: path, id };
}

export function query(collectionOrQueryRef, ...constraints) {
  // Support chaining: when called with an existing query object, merge constraints
  if (collectionOrQueryRef && collectionOrQueryRef.__type === 'query') {
    return {
      __type: 'query',
      collection: collectionOrQueryRef.collection,
      constraints: [...collectionOrQueryRef.constraints, ...constraints],
    };
  }
  return { __type: 'query', collection: collectionOrQueryRef.path, constraints };
}

// --- Constraint to query-param translation ---

function buildQueryParams(constraints) {
  const params = new URLSearchParams();
  const filters = [];
  for (const c of constraints) {
    if (c.type === 'where') {
      if (c.op === '==') {
        params.set(c.field, c.value);
      } else if (c.op === 'in' && Array.isArray(c.value)) {
        // Translate array-contains 'in' operator to a comma-separated query param.
        // The backend converts it back to a WHERE IN clause.
        params.set(`${c.field}__in`, c.value.join(','));
      } else {
        filters.push(c);
      }
    } else if (c.type === 'orderBy') {
      params.set('orderBy', c.field);
      params.set('order', c.direction);
    } else if (c.type === 'limit') {
      params.set('limit', c.value);
    }
  }
  return { params, filters };
}

function applyClientFilter(records, filters) {
  if (!filters.length) return records;
  return records.filter((rec) =>
    filters.every((f) => {
      const val = rec[f.field];
      switch (f.op) {
        case '>': return val > f.value;
        case '>=': return val >= f.value;
        case '<': return val < f.value;
        case '<=': return val <= f.value;
        case '!=': return val !== f.value;
        case 'in': return Array.isArray(f.value) && f.value.includes(val);
        case 'array-contains': return Array.isArray(val) && val.includes(f.value);
        case 'array-contains-any': return Array.isArray(val) && f.value.some((v) => val.includes(v));
        default: return true;
      }
    })
  );
}

// --- Snapshot helpers ---

function makeDocSnapshot(id, data, collectionName = '') {
  return {
    id,
    exists: () => true,
    data: () => data,
    ref: { __type: 'doc', collection: collectionName, id },
  };
}

function makeQuerySnapshot(records, collectionName = '') {
  const docs = records.map((r) => {
    const { id, ...rest } = r;
    return makeDocSnapshot(id || r.id, rest, collectionName);
  });
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
    map: (cb) => docs.map(cb),
    // Firebase-compatible docChanges — returns all docs as "added" type.
    // onSnapshot re-fetches the full query each poll, so we track which docs
    // we've already seen via a closure on the snapshot instance.
    docChanges: () => docs.map((d) => ({ type: 'added', doc: d })),
  };
}

// --- Read operations ---

export async function getDocs(queryRef) {
  const { params, filters } = buildQueryParams(queryRef.constraints || []);
  const qs = params.toString();
  const collectionName = queryRef.collection || queryRef.path;
  const path = `/data/${collectionName}${qs ? `?${qs}` : ''}`;
  const cacheKey = offlineCache.keyForRequest(`/data/${collectionName}`, Object.fromEntries(params));

  try {
    const body = await apiFetch(path);
    const records = body.data || [];
    const filtered = applyClientFilter(records, filters);
    offlineCache.set(cacheKey, records);
    return makeQuerySnapshot(filtered, collectionName);
  } catch (error) {
    if ((error.code === 'network-error' || !offlineCache.isOnline())) {
      const cached = offlineCache.get(cacheKey);
      if (cached) {
        const filtered = applyClientFilter(cached, filters);
        return { ...makeQuerySnapshot(filtered, collectionName), __offline: true };
      }
    }
    throw error;
  }
}

export async function getDoc(docRef) {
  const cacheKey = offlineCache.keyForRequest(`/data/${docRef.collection}/${docRef.id}`, {});

  try {
    const body = await apiFetch(`/data/${docRef.collection}/${docRef.id}`);
    const record = body.data || {};
    offlineCache.set(cacheKey, record);
    return {
      id: record.id || docRef.id,
      exists: () => true,
      data: () => record,
      ref: docRef,
    };
  } catch (err) {
    if (err.code === 404) {
      offlineCache.remove(cacheKey);
      return { id: docRef.id, exists: () => false, data: () => null, ref: docRef };
    }
    if ((err.code === 'network-error' || !offlineCache.isOnline())) {
      const cached = offlineCache.get(cacheKey);
      if (cached) {
        return {
          id: cached.id || docRef.id,
          exists: () => true,
          data: () => cached,
          ref: docRef,
          __offline: true,
        };
      }
    }
    throw err;
  }
}

// --- Write operations ---

export async function addDoc(collectionRef, data) {
  const body = await apiFetch(`/data/${collectionRef.path}`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  const record = body.data || {};
  // Return the id plus any extra fields the backend may have added
  // (e.g. loginAccount for auto-created client accounts)
  return { id: record.id || 'unknown', ...record };
}

export async function setDoc(docRef, data, _options) {
  await apiFetch(`/data/${docRef.collection}/${docRef.id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function updateDoc(docRef, data) {
  await apiFetch(`/data/${docRef.collection}/${docRef.id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteDoc(docRef) {
  await apiFetch(`/data/${docRef.collection}/${docRef.id}`, {
    method: 'DELETE',
  });
}

// --- Real-time listeners (polling-based) ---

const POLL_INTERVAL = 5000;
const FAST_POLL_INTERVAL = 1000; // For signaling/call notifications

export function onSnapshot(queryRef, callback, errorCallback) {
  // Determine poll interval — use faster polling for signaling and
  // callNotifications collections where near-real-time delivery is critical
  const collectionName = queryRef.collection || queryRef.path || '';
  const isFastCollection = collectionName === 'signaling' || collectionName === 'callNotifications';
  const interval = isFastCollection ? FAST_POLL_INTERVAL : POLL_INTERVAL;

  // Track which doc IDs we've already emitted so docChanges only reports
  // genuinely new documents (matching Firebase onSnapshot semantics).
  const seenIds = new Set();
  let isFirstPoll = true;

  const poll = () => {
    getDocs(queryRef)
      .then((snap) => {
        // Build a filtered snapshot that only includes new docs in docChanges
        const newDocs = snap.docs.filter((d) => {
          const isNew = !seenIds.has(d.id);
          if (isNew) seenIds.add(d.id);
          return isNew;
        });

        // On first poll, all docs are "added". On subsequent polls, only
        // genuinely new docs are "added". Return the full docs list but
        // with docChanges reflecting only new additions.
        const changes = newDocs.map((d) => ({ type: 'added', doc: d }));

        const enrichedSnap = {
          ...snap,
          docs: snap.docs,
          empty: snap.empty,
          size: snap.size,
          docChanges: () => changes,
        };

        // Only call back if there are actual changes (or it's the first poll)
        if (changes.length > 0 || isFirstPoll) {
          callback(enrichedSnap);
          isFirstPoll = false;
        }
      })
      .catch((err) => errorCallback && errorCallback(err));
  };

  poll();
  const intervalId = setInterval(poll, interval);

  // Subscribe to SSE push events for this collection. When the backend
  // reports a change, poll immediately instead of waiting for the interval.
  const unsubscribeSSE = collectionName
    ? sseService.subscribe(collectionName, () => {
        poll();
      })
    : null;

  return () => {
    clearInterval(intervalId);
    if (unsubscribeSSE) unsubscribeSSE();
  };
}

// --- Batch & Transaction ---

export function writeBatch() {
  const ops = [];
  return {
    set(ref, data) { ops.push({ type: 'set', ref, data }); },
    update(ref, data) { ops.push({ type: 'update', ref, data }); },
    delete(ref) { ops.push({ type: 'delete', ref }); },
    async commit() {
      for (const op of ops) {
        if (op.type === 'set') await setDoc(op.ref, op.data);
        else if (op.type === 'update') await updateDoc(op.ref, op.data);
        else if (op.type === 'delete') await deleteDoc(op.ref);
      }
    },
  };
}

export async function runTransaction(_db, updateFn) {
  const tx = {
    async get(ref) { return getDoc(ref); },
    async set(ref, data) { await setDoc(ref, data); },
    async update(ref, data) { await updateDoc(ref, data); },
    async delete(ref) { await deleteDoc(ref); },
  };
  return updateFn(tx);
}

// --- FieldValue helpers ---

export const serverTimestamp = () => new Date().toISOString();

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
  fromMillis: (ms) => Timestamp.fromDate(new Date(ms)),
};

export const FieldValue = {
  serverTimestamp,
  increment: (n = 1) => ({ __increment: n }),
  arrayUnion: (...elements) => ({ __arrayUnion: elements }),
  arrayRemove: (...elements) => ({ __arrayRemove: elements }),
};

export const increment = (n = 1) => FieldValue.increment(n);
export const arrayUnion = (...elements) => FieldValue.arrayUnion(...elements);
export const arrayRemove = (...elements) => FieldValue.arrayRemove(...elements);
