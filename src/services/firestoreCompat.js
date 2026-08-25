import { dataAPI } from '../api/dataAPI';
import { collection, query, getDocs, getDoc, setDoc, updateDoc, deleteDoc, addDoc, where, orderBy, limit, onSnapshot, doc, serverTimestamp, writeBatch, runTransaction, Timestamp, increment, arrayUnion, arrayRemove, startAt, startAfter, endAt, endBefore } from 'backend/database';
import { db } from '../backend/config';
import { Timestamp } from 'backend/auth';

// Database compatibility layer - routes all Database calls to PostgreSQL backend
// This allows existing API files to work without modification

export class Timestamp {
  constructor(seconds, nanoseconds) {
    this.seconds = seconds || Math.floor(Date.now() / 1000);
    this.nanoseconds = nanoseconds || 0;
  }

  toDate() {
    return new Date(this.seconds * 1000);
  }

  toMillis() {
    return this.seconds * 1000;
  }

  static fromDate(date) {
    return new Timestamp(Math.floor(date.getTime() / 1000), 0);
  }

  static now() {
    return new Timestamp();
  }
}

export function serverTimestamp() {
  return new Date().toISOString();
}

// Mock DB object
export const compatDb = {
  _type: 'compat-db'
};

class QueryConstraint {
  constructor(type, field, op, value) {
    this.type = type;
    this.field = field;
    this.op = op;
    this.value = value;
  }
}

class CompatCollectionRef {
  constructor(table) {
    this._table = table;
  }
}

class CompatDocRef {
  constructor(table, id) {
    this._table = table;
    this.id = id;
  }
}

class CompatQuery {
  constructor(collectionRef, constraints = []) {
    this._table = collectionRef._table;
    this._constraints = constraints;
  }
}

class CompatQuerySnapshot {
  constructor(docs) {
    this.docs = docs;
    this.empty = docs.length === 0;
    this.size = docs.length;
  }

  forEach(callback) {
    this.docs.forEach(callback);
  }
}

class CompatDocSnapshot {
  constructor(id, data) {
    this.id = id;
    this._data = data;
  }

  exists() {
    return this._data !== null && this._data !== undefined;
  }

  data() {
    return this._data;
  }
}

export function collection(db, table) {
  return new CompatCollectionRef(table);
}

export function doc(db, tableOrCollection, id) {
  if (id) {
    return new CompatDocRef(tableOrCollection, id);
  }
  // doc(db, 'path/to/doc') not fully supported, assume simple table/id
  return new CompatDocRef(tableOrCollection, null);
}

export function query(collectionRef, ...constraints) {
  return new CompatQuery(collectionRef, constraints);
}

export function where(field, op, value) {
  return new QueryConstraint('where', field, op, value);
}

export function orderBy(field, dir = 'asc') {
  return new QueryConstraint('orderBy', field, dir);
}

export function limit(n) {
  return new QueryConstraint('limit', null, null, n);
}

function buildFilters(constraints) {
  const filters = {};
  let orderField = 'created_at';
  let orderDir = 'desc';
  let limitVal = 100;

  for (const c of constraints) {
    if (c.type === 'where' && c.op === '==') {
      filters[c.field] = c.value;
    } else if (c.type === 'orderBy') {
      orderField = c.field;
      orderDir = c.value || 'asc';
    } else if (c.type === 'limit') {
      limitVal = c.value;
    }
  }

  return { filters, orderField, orderDir, limitVal };
}

export async function getDocs(queryObj) {
  const table = queryObj._table;
  const { filters } = buildFilters(queryObj._constraints || []);

  const records = await dataAPI.list(table, filters);

  const docs = records.map(r => new CompatDocSnapshot(r.id, r));
  return new CompatQuerySnapshot(docs);
}

export async function getDoc(docRef) {
  const data = await dataAPI.get(docRef._table, docRef.id);
  return new CompatDocSnapshot(docRef.id, data);
}

export async function addDoc(collectionRef, data) {
  const record = await dataAPI.create(collectionRef._table, data);
  return new CompatDocRef(collectionRef._table, record.id);
}

export async function setDoc(docRef, data, options = {}) {
  if (options.merge) {
    const existing = await dataAPI.get(docRef._table, docRef.id).catch(() => null);
    if (existing) {
      await dataAPI.update(docRef._table, docRef.id, { ...existing, ...data });
      return;
    }
  }
  await dataAPI.create(docRef._table, { ...data, id: docRef.id });
}

export async function updateDoc(docRef, data) {
  await dataAPI.update(docRef._table, docRef.id, data);
}

export async function deleteDoc(docRef) {
  await dataAPI.delete(docRef._table, docRef.id);
}

export function onSnapshot(queryOrRef, callbackOrOptions, callbackOrNull) {
  let callback = typeof callbackOrOptions === 'function' ? callbackOrOptions : callbackOrNull;
  let table, constraints = [];

  if (queryOrRef._table) {
    table = queryOrRef._table;
    if (queryOrRef._constraints) {
      constraints = queryOrRef._constraints;
    }
  }

  if (!table || !callback) {
    return () => {};
  }

  let running = true;

  const poll = async () => {
    if (!running) return;
    try {
      const { filters } = buildFilters(constraints);
      const records = await dataAPI.list(table, filters);
      const docs = records.map(r => new CompatDocSnapshot(r.id, r));
      const snapshot = new CompatQuerySnapshot(docs);
      callback(snapshot);
    } catch (e) {
      console.warn('onSnapshot poll error:', e.message);
    }
    if (running) {
      setTimeout(poll, 5000);
    }
  };

  poll();

  return () => { running = false; };
}

export async function getCountFromServer(queryObj) {
  const records = await dataAPI.list(queryObj._table, {});
  return { data: { count: records.length } };
}

// Batch operations
class CompatWriteBatch {
  constructor() {
    this._ops = [];
  }

  set(docRef, data) {
    this._ops.push({ type: 'set', docRef, data });
    return this;
  }

  update(docRef, data) {
    this._ops.push({ type: 'update', docRef, data });
    return this;
  }

  delete(docRef) {
    this._ops.push({ type: 'delete', docRef });
    return this;
  }

  async commit() {
    for (const op of this._ops) {
      if (op.type === 'set') {
        await setDoc(op.docRef, op.data);
      } else if (op.type === 'update') {
        await updateDoc(op.docRef, op.data);
      } else if (op.type === 'delete') {
        await deleteDoc(op.docRef);
      }
    }
  }
}

export function writeBatch() {
  return new CompatWriteBatch();
}

export function runTransaction() {
  // Not fully supported - return a no-op
  return Promise.resolve();
}

// Field value utilities
export function increment(n) {
  return { _fieldValue: 'increment', value: n };
}

export function arrayUnion(...elements) {
  return { _fieldValue: 'arrayUnion', elements };
}

export function arrayRemove(...elements) {
  return { _fieldValue: 'arrayRemove', elements };
}

export function deleteField() {
  return { _fieldValue: 'delete' };
}

// Pagination cursors
export function startAfter(value) {
  return new QueryConstraint('startAfter', null, null, value);
}

export function startAt(value) {
  return new QueryConstraint('startAt', null, null, value);
}

export function endBefore(value) {
  return new QueryConstraint('endBefore', null, null, value);
}

export function endAt(value) {
  return new QueryConstraint('endAt', null, null, value);
}

