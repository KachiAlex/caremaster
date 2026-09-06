/**
 * storage.js - Cloudflare R2 storage compatibility layer.
 *
 * Replaces the Cloudinary direct-upload approach with backend-mediated
 * uploads to Cloudflare R2. The frontend sends files to /api/upload
 * (multipart) or /api/upload/base64 (JSON), and the backend handles
 * the S3-compatible R2 API with credentials that never leave the server.
 *
 * Function signatures match the Firebase Storage SDK so consuming code
 * doesn't need to change: ref(), uploadBytes(), getDownloadURL(), etc.
 */

const API_BASE = () =>
  process.env.REACT_APP_API_URL || process.env.REACT_APP_API_BASE_URL || '';

function getToken() {
  return localStorage.getItem('token') || localStorage.getItem('authToken') || '';
}

// ── Reference builders (same shape as Firebase SDK) ────────────

export const getStorage = (_app) => ({ __type: 'storage' });
export const connectStorageEmulator = () => {};

export function ref(_storage, path) {
  return { __type: 'storage-ref', path };
}

// ── Upload via backend API ─────────────────────────────────────

/**
 * Upload a File/Blob to R2 via the backend multipart endpoint.
 *
 * @param {object} storageRef - Ref created by ref()
 * @param {File|Blob} file - The file to upload
 * @param {object} _metadata - Ignored (kept for SDK compatibility)
 * @returns {Promise<{ ref, bytesTransferred, totalBytes, metadata, downloadURL }>}
 */
export async function uploadBytes(storageRef, file, _metadata) {
  const token = getToken();
  const formData = new FormData();

  // Extract folder from the ref path: "users/123/documents/license.pdf" → "documents"
  const pathParts = (storageRef.path || '').split('/');
  const folder = pathParts.length >= 3 ? pathParts[1] : 'uploads';
  const fileName = pathParts[pathParts.length - 1] || file.name || 'file';

  formData.append('file', file, fileName);
  formData.append('folder', folder);

  const url = `${API_BASE()}/upload`;
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  // Note: do NOT set Content-Type — the browser sets it with the boundary for FormData

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: formData,
  });

  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : {}; } catch { body = { raw: text }; }

  if (!res.ok) {
    const err = new Error(body.message || `Upload failed (${res.status})`);
    err.code = res.status;
    err.response = body;
    throw err;
  }

  const data = body.data || {};
  return {
    ref: { ...storageRef, downloadURL: data.url },
    bytesTransferred: file.size,
    totalBytes: file.size,
    metadata: { contentType: file.type, size: file.size, name: fileName },
    downloadURL: data.url,
  };
}

/**
 * Resumable upload (simplified — just calls uploadBytes).
 * Kept for SDK compatibility with code that uses .on() callbacks.
 */
export function uploadBytesResumable(storageRef, file) {
  const task = {
    snapshot: { bytesTransferred: 0, totalBytes: file.size, ref: storageRef, state: 'running' },
    on: (event, next, error, complete) => {
      task.snapshot.bytesTransferred = file.size * 0.5;
      if (next) next(task.snapshot);
      uploadBytes(storageRef, file)
        .then((result) => {
          task.snapshot.bytesTransferred = file.size;
          task.snapshot.state = 'success';
          task.snapshot.downloadURL = result.downloadURL;
          task.snapshot.ref = { ...storageRef, downloadURL: result.downloadURL };
          if (complete) complete();
        })
        .catch((err) => {
          task.snapshot.state = 'error';
          if (error) error(err);
        });
    },
    cancel: () => { task.snapshot.state = 'canceled'; },
  };
  return task;
}

// ── Download URL ───────────────────────────────────────────────

/**
 * Get the public download URL for a storage ref.
 * If the ref already has a downloadURL (from uploadBytes), return it.
 */
export async function getDownloadURL(storageRef) {
  if (storageRef.downloadURL) return storageRef.downloadURL;
  // Construct URL from the public base + path
  const publicBase = process.env.REACT_APP_R2_PUBLIC_URL || '';
  if (publicBase) {
    return `${publicBase.replace(/\/$/, '')}/${storageRef.path}`;
  }
  // Fallback: return the path as-is (won't work for public access, but prevents crashes)
  return storageRef.path;
}

// ── Other operations (stubs for SDK compatibility) ─────────────

export async function deleteObject(_storageRef) {
  // Best-effort delete via backend
  try {
    const token = getToken();
    await fetch(`${API_BASE()}/upload`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ key: _storageRef.path }),
    });
  } catch (e) {
    // Non-critical
  }
  return Promise.resolve();
}

export async function getMetadata(storageRef) {
  return {
    name: storageRef.path.split('/').pop(),
    fullPath: storageRef.path,
    size: 0,
    contentType: 'application/octet-stream',
  };
}

export const updateMetadata = () => Promise.resolve();
export const listAll = () => Promise.resolve({ items: [], prefixes: [] });
