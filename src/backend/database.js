/**
 * database.js - Real Express API compatibility layer.
 *
 * Replaces the Firebase Firestore SDK with calls to the Express backend
 * (GET/POST/PUT/DELETE /api/data/:table). Consuming files import the same
 * function names (collection, doc, getDocs, getDoc, setDoc, etc.) and get
 * real API behaviour instead of stubs.
 */

// --- HTTP helper ---

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

  const res = await fetch(url, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('token');
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    // Redirect to login if not already there
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

function makeDocSnapshot(id, data) {
  return {
    id,
    exists: () => true,
    data: () => data,
    ref: { __type: 'doc', collection: '', id },
  };
}

function makeQuerySnapshot(records) {
  const docs = records.map((r) => {
    const { id, ...rest } = r;
    return makeDocSnapshot(id || r.id, rest);
  });
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (cb) => docs.forEach(cb),
    map: (cb) => docs.map(cb),
  };
}

// --- Read operations ---

export async function getDocs(queryRef) {
  const { params, filters } = buildQueryParams(queryRef.constraints || []);
  const qs = params.toString();
  const collectionName = queryRef.collection || queryRef.path;
  const path = `/data/${collectionName}${qs ? `?${qs}` : ''}`;
  const body = await apiFetch(path);
  const records = body.data || [];
  const filtered = applyClientFilter(records, filters);
  return makeQuerySnapshot(filtered);
}

export async function getDoc(docRef) {
  try {
    const body = await apiFetch(`/data/${docRef.collection}/${docRef.id}`);
    const record = body.data || {};
    return {
      id: record.id || docRef.id,
      exists: () => true,
      data: () => record,
      ref: docRef,
    };
  } catch (err) {
    if (err.code === 404) {
      return { id: docRef.id, exists: () => false, data: () => null, ref: docRef };
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

export function onSnapshot(queryRef, callback, errorCallback) {
  getDocs(queryRef)
    .then((snap) => callback(snap))
    .catch((err) => errorCallback && errorCallback(err));

  const intervalId = setInterval(() => {
    getDocs(queryRef)
      .then((snap) => callback(snap))
      .catch((err) => errorCallback && errorCallback(err));
  }, POLL_INTERVAL);

  return () => clearInterval(intervalId);
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
