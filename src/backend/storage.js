/**
 * storage.js - Cloudinary-based file storage compatibility layer.
 */

export const getStorage = (_app) => ({ __type: 'storage' });
export const connectStorageEmulator = () => {};

const CLOUD_NAME = () => process.env.REACT_APP_CLOUDINARY_CLOUD_NAME || 'dgp7mawaw';
const UPLOAD_PRESET = () => process.env.REACT_APP_CLOUDINARY_UPLOAD_PRESET || 'caremaster_profiles';

export function ref(_storage, path) {
  return { __type: 'storage-ref', path };
}

export async function uploadBytes(storageRef, file) {
  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME()}/upload`;
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET());
  formData.append('public_id', storageRef.path.replace(/\//g, '_'));

  const res = await fetch(url, { method: 'POST', body: formData });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload failed');

  return {
    ref: storageRef,
    bytesTransferred: file.size,
    totalBytes: file.size,
    metadata: { contentType: file.type, size: file.size },
    downloadURL: data.secure_url,
  };
}

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
        .catch((err) => { task.snapshot.state = 'error'; if (error) error(err); });
    },
    cancel: () => { task.snapshot.state = 'canceled'; },
  };
  return task;
}

export async function getDownloadURL(storageRef) {
  if (storageRef.downloadURL) return storageRef.downloadURL;
  const publicId = storageRef.path.replace(/\//g, '_');
  return `https://res.cloudinary.com/${CLOUD_NAME()}/image/upload/${publicId}`;
}

export async function deleteObject(_storageRef) { return Promise.resolve(); }
export async function getMetadata(storageRef) {
  return { name: storageRef.path.split('/').pop(), fullPath: storageRef.path, size: 0, contentType: 'application/octet-stream' };
}
export const updateMetadata = () => Promise.resolve();
export const listAll = () => Promise.resolve({ items: [], prefixes: [] });
