/**
 * r2Service.js - Cloudflare R2 object storage service.
 *
 * Uses the S3-compatible API to upload, read, and delete files from R2.
 * Credentials are kept server-side only — the frontend never sees the
 * secret access key.
 */
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const { logger } = require('../utils/logger');

// ── Configuration ──────────────────────────────────────────────
const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'caremaster';
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || '';

const S3_ENDPOINT = `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`;

// ── S3 Client ──────────────────────────────────────────────────
let s3Client = null;

function getClient() {
  if (s3Client) return s3Client;
  if (!ACCESS_KEY_ID || !SECRET_ACCESS_KEY || !ACCOUNT_ID) {
    throw new Error('R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY in backend .env');
  }
  s3Client = new S3Client({
    region: 'auto',
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    },
  });
  return s3Client;
}

// ── Public URL builder ─────────────────────────────────────────
/**
 * Build the public URL for an object key.
 * Uses the R2 public development URL or custom domain.
 */
function getPublicUrl(key) {
  if (PUBLIC_BASE_URL) {
    const base = PUBLIC_BASE_URL.replace(/\/$/, '');
    return `${base}/${key}`;
  }
  // Fallback: S3 endpoint (works for authenticated requests, not public)
  return `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
}

// ── Upload ─────────────────────────────────────────────────────
/**
 * Upload a file to R2.
 *
 * @param {string} key - Object key (path) in the bucket, e.g. "users/123/documents/license.pdf"
 * @param {Buffer} buffer - File content
 * @param {string} contentType - MIME type, e.g. "image/png"
 * @returns {Promise<{ key: string, url: string, etag: string }>}
 */
async function uploadFile(key, buffer, contentType) {
  const client = getClient();

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream',
  });

  const response = await client.send(command);
  const url = getPublicUrl(key);

  logger.info(`R2 upload: ${key} (${buffer.length} bytes) → ${url}`);

  return {
    key,
    url,
    etag: response.ETag,
  };
}

// ── Delete ─────────────────────────────────────────────────────
/**
 * Delete a file from R2.
 * @param {string} key - Object key to delete
 */
async function deleteFile(key) {
  const client = getClient();
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });
  await client.send(command);
  logger.info(`R2 delete: ${key}`);
  return true;
}

// ── Health check ───────────────────────────────────────────────
/**
 * Check if R2 is configured.
 */
function isConfigured() {
  return !!(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY);
}

module.exports = {
  uploadFile,
  deleteFile,
  getPublicUrl,
  isConfigured,
  BUCKET_NAME,
};
