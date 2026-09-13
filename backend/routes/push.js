/**
 * Push Subscription Routes
 *
 * POST   /api/push/subscribe         — register a push subscription
 * DELETE /api/push/unsubscribe       — remove a push subscription
 * GET    /api/push/vapid-public-key   — get the public VAPID key
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { logger } = require('../utils/logger');
const webPush = require('../services/webPush');

const router = express.Router();

/**
 * Get the public VAPID key (no auth required — needed before login
 * so the browser can subscribe during service worker install).
 */
router.get('/vapid-public-key', (req, res) => {
  const publicKey = webPush.getPublicKey();
  if (!publicKey) {
    return res.status(503).json({ success: false, message: 'Push notifications not configured' });
  }
  res.json({ success: true, data: { publicKey } });
});

router.use(authenticateToken);

/**
 * Register a push subscription for the authenticated user.
 * Body: { subscription: PushSubscription }
 */
router.post('/subscribe', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({ success: false, message: 'Invalid subscription' });
    }

    const saved = await webPush.saveSubscription(req.user.id, subscription);
    if (!saved) {
      return res.status(400).json({ success: false, message: 'Failed to save subscription' });
    }

    res.json({ success: true, message: 'Push subscription registered' });
  } catch (error) {
    logger.error('Push subscribe error:', error);
    res.status(500).json({ success: false, message: 'Failed to register subscription' });
  }
});

/**
 * Remove a push subscription for the authenticated user.
 * Body: { endpoint: string }
 */
router.delete('/unsubscribe', async (req, res) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) {
      return res.status(400).json({ success: false, message: 'Endpoint required' });
    }

    const removed = await webPush.removeSubscription(req.user.id, endpoint);
    res.json({ success: true, removed });
  } catch (error) {
    logger.error('Push unsubscribe error:', error);
    res.status(500).json({ success: false, message: 'Failed to remove subscription' });
  }
});

module.exports = router;
