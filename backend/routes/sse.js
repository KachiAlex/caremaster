const express = require('express');
const router = express.Router();
const sseManager = require('../sse');
const { authenticateToken } = require('../middleware/auth');

/**
 * SSE endpoint for real-time updates.
 *
 * The frontend opens this stream after login. The server then pushes
 * `table-change` events when relevant data is written. If the connection
 * drops, the frontend is expected to reconnect with exponential backoff.
 */
router.get('/', authenticateToken, (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flush?.();

  const userId = req.user?.id || req.user?.uid;
  const institutionId = req.user?.institution_id || req.user?.institutionId;

  const client = sseManager.addClient(userId, institutionId, res);
  if (!client) {
    res.status(400).end();
    return;
  }

  // Keep-alive comment every 30s is handled by SSEManager
});

module.exports = router;
