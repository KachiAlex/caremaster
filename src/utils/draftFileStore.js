/**
 * Persists selected File objects for form drafts in IndexedDB.
 *
 * localStorage (used for the typed-field draft) can't hold File/Blob data —
 * IndexedDB stores blobs natively via structured clone, so documents the
 * user attached mid-registration survive tab closes, crashes, and offline
 * interruptions, then get re-attached when the draft is restored.
 */

const DB_NAME = 'caremaster-drafts';
const STORE = 'files';
const DB_VERSION = 1;
// Keep IndexedDB usage sane — bigger files just aren't persisted (the form
// already rejects >10MB anyway).
const MAX_FILE_BYTES = 15 * 1024 * 1024;

const openDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined') {
    return reject(new Error('IndexedDB is not available'));
  }
  const req = indexedDB.open(DB_NAME, DB_VERSION);
  req.onupgradeneeded = () => {
    if (!req.result.objectStoreNames.contains(STORE)) {
      req.result.createObjectStore(STORE);
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

const run = (db, mode, fn) => new Promise((resolve, reject) => {
  const tx = db.transaction(STORE, mode);
  const req = fn(tx.objectStore(STORE));
  tx.oncomplete = () => resolve(req && req.result);
  tx.onerror = () => reject(tx.error);
});

const fileKey = (draftKey, docType) => `${draftKey}::${docType}`;

/**
 * Sync the stored files for a draft with the form's current selection.
 * Writes every selected file and deletes entries whose doc type was removed.
 * documents: { [docType]: { file: File, type: string } | null }
 */
export const saveDraftFiles = async (draftKey, documents) => {
  const db = await openDb();
  try {
    const wanted = new Set();
    for (const [docType, docData] of Object.entries(documents || {})) {
      const file = docData && docData.file;
      if (!file || file.size > MAX_FILE_BYTES) continue;
      const key = fileKey(draftKey, docType);
      wanted.add(key);
      await run(db, 'readwrite', (store) => store.put({
        blob: file,
        name: file.name,
        type: file.type,
        lastModified: file.lastModified
      }, key));
    }
    const keys = (await run(db, 'readonly', (store) => store.getAllKeys())) || [];
    for (const key of keys) {
      if (String(key).startsWith(`${draftKey}::`) && !wanted.has(key)) {
        await run(db, 'readwrite', (store) => store.delete(key));
      }
    }
  } finally {
    db.close();
  }
};

/**
 * Load stored files for a draft as { [docType]: { file, type } } — the same
 * shape the form's uploadedDocuments state uses.
 */
export const getDraftFiles = async (draftKey) => {
  const db = await openDb();
  try {
    const keys = ((await run(db, 'readonly', (store) => store.getAllKeys())) || [])
      .filter((k) => String(k).startsWith(`${draftKey}::`));
    const out = {};
    for (const key of keys) {
      const rec = await run(db, 'readonly', (store) => store.get(key));
      if (!rec || !rec.blob) continue;
      const docType = String(key).slice(`${draftKey}::`.length);
      // Some engines clone File as Blob — rebuild a File so name/type survive
      const file = rec.blob instanceof File
        ? rec.blob
        : new File([rec.blob], rec.name, { type: rec.type, lastModified: rec.lastModified });
      out[docType] = { file, type: docType };
    }
    return out;
  } finally {
    db.close();
  }
};

/** Delete every stored file belonging to a draft. */
export const deleteDraftFiles = async (draftKey) => {
  const db = await openDb();
  try {
    const keys = ((await run(db, 'readonly', (store) => store.getAllKeys())) || [])
      .filter((k) => String(k).startsWith(`${draftKey}::`));
    for (const key of keys) {
      await run(db, 'readwrite', (store) => store.delete(key));
    }
  } finally {
    db.close();
  }
};

export default { saveDraftFiles, getDraftFiles, deleteDraftFiles };
