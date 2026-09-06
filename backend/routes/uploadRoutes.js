/**
 * uploadRoutes.js - File upload routes backed by Cloudflare R2.
 *
 * POST /api/upload          — single file upload (multipart/form-data)
 * POST /api/upload/base64   — base64-encoded file upload (JSON body)
 * DELETE /api/upload        — delete a file by key
 *
 * Files are uploaded to R2 via the S3-compatible API. The public URL
 * is returned to the client. Secrets never leave the server.
 */
const express = require('express');
const multer = require('multer');
const { authenticateToken } = require('../middleware/auth');
const r2Service = require('../services/r2Service');
const { logger } = require('../utils/logger');

const router = express.Router();

// Multer stores files in memory (not disk) so we can stream them to R2
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/csv',
    ];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`), false);
    }
  },
});

// ── POST /api/upload — multipart file upload ───────────────────
router.post('/', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' });
    }

    if (!r2Service.isConfigured()) {
      return res.status(500).json({ success: false, message: 'R2 storage is not configured' });
    }

    // Build the object key: users/{userId}/{folder}/{timestamp}_{filename}
    const userId = req.user.id;
    const folder = req.body.folder || 'uploads';
    const timestamp = Date.now();
    const safeName = req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `users/${userId}/${folder}/${timestamp}_${safeName}`;

    const result = await r2Service.uploadFile(key, req.file.buffer, req.file.mimetype);

    res.status(201).json({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        etag: result.etag,
        originalName: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype,
      },
    });
  } catch (error) {
    logger.error('Upload error:', error);
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ success: false, message: 'File too large (max 10MB)' });
    }
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

// ── POST /api/upload/base64 — base64-encoded upload ────────────
router.post('/base64', authenticateToken, async (req, res) => {
  try {
    const { fileData, fileName, mimeType, folder } = req.body;

    if (!fileData || !mimeType) {
      return res.status(400).json({ success: false, message: 'fileData and mimeType are required' });
    }

    if (!r2Service.isConfigured()) {
      return res.status(500).json({ success: false, message: 'R2 storage is not configured' });
    }

    // Strip data URL prefix if present
    const base64Data = fileData.replace(/^data:[^;]+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (buffer.length > 10 * 1024 * 1024) {
      return res.status(413).json({ success: false, message: 'File too large (max 10MB)' });
    }

    const userId = req.user.id;
    const folderName = folder || 'uploads';
    const timestamp = Date.now();
    const safeName = (fileName || `file_${timestamp}`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = mimeType.split('/')[1] || 'bin';
    const key = `users/${userId}/${folderName}/${timestamp}_${safeName}.${ext}`;

    const result = await r2Service.uploadFile(key, buffer, mimeType);

    res.status(201).json({
      success: true,
      data: {
        key: result.key,
        url: result.url,
        etag: result.etag,
        size: buffer.length,
        mimeType,
      },
    });
  } catch (error) {
    logger.error('Base64 upload error:', error);
    res.status(500).json({ success: false, message: error.message || 'Upload failed' });
  }
});

// ── DELETE /api/upload — delete a file ─────────────────────────
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { key } = req.body;
    if (!key) {
      return res.status(400).json({ success: false, message: 'File key is required' });
    }

    // Security: only allow deleting files under the user's own path
    const userPrefix = `users/${req.user.id}/`;
    if (!key.startsWith(userPrefix)) {
      return res.status(403).json({ success: false, message: 'You can only delete your own files' });
    }

    await r2Service.deleteFile(key);
    res.json({ success: true, message: 'File deleted' });
  } catch (error) {
    logger.error('Delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete file' });
  }
});

// ── GET /api/upload/status — check if R2 is configured ─────────
router.get('/status', authenticateToken, (req, res) => {
  res.json({
    success: true,
    data: {
      configured: r2Service.isConfigured(),
      bucket: r2Service.BUCKET_NAME,
    },
  });
});

module.exports = router;
