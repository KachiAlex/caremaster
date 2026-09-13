/**
 * Web Push Service
 *
 * Manages VAPID keys, push subscriptions, and sending web push
 * notifications to subscribed browsers. Used by the notification
 * dispatcher to deliver push notifications alongside in-app notifications.
 *
 * VAPID keys are generated on first run and persisted to the
 * `push_subscriptions` table's metadata, or to a file on disk.
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');
const db = require('../utils/database');
const { logger } = require('../utils/logger');

const VAPID_KEYS_FILE = path.join(__dirname, '..', '.vapid-keys.json');
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@caremaster.com';

let vapidKeys = null;

/**
 * Load VAPID keys from disk, or generate new ones if they don't exist.
 */
function loadOrGenerateVapidKeys() {
  if (vapidKeys) return vapidKeys;

  // Try loading from file
  try {
    if (fs.existsSync(VAPID_KEYS_FILE)) {
      vapidKeys = JSON.parse(fs.readFileSync(VAPID_KEYS_FILE, 'utf8'));
      logger.info('VAPID keys loaded from disk');
      return vapidKeys;
    }
  } catch (err) {
    logger.warn('Failed to read VAPID keys file:', err.message);
  }

  // Generate new keys
  vapidKeys = webpush.generateVAPIDKeys();

  // Persist to disk for future runs
  try {
    fs.writeFileSync(VAPID_KEYS_FILE, JSON.stringify(vapidKeys, null, 2), 'utf8');
    logger.info('VAPID keys generated and saved to disk');
  } catch (err) {
    logger.warn('Failed to save VAPID keys to disk:', err.message);
  }

  return vapidKeys;
}

/**
 * Initialize web-push with VAPID keys.
 */
function initWebPush() {
  const keys = loadOrGenerateVapidKeys();
  webpush.setVapidDetails(VAPID_SUBJECT, keys.publicKey, keys.privateKey);
  logger.info('Web Push initialized with VAPID subject:', VAPID_SUBJECT);
}

// Initialize on module load
try {
  initWebPush();
} catch (err) {
  logger.error('Failed to initialize web push:', err);
}

/**
 * Get the public VAPID key (exposed to the frontend for subscription).
 */
function getPublicKey() {
  return vapidKeys?.publicKey || null;
}

/**
 * Save a push subscription for a user.
 * @param {string} userId
 * @param {object} subscription - PushSubscription from the browser
 */
async function saveSubscription(userId, subscription) {
  if (!userId || !subscription) return false;

  try {
    const endpoint = subscription.endpoint;
    const p256dh = subscription.keys?.p256dh;
    const auth = subscription.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      logger.warn('Incomplete push subscription:', { endpoint: !!endpoint, p256dh: !!p256dh, auth: !!auth });
      return false;
    }

    // Upsert: if the endpoint already exists for this user, update it
    const existing = await db('push_subscriptions')
      .where({ user_id: String(userId), endpoint })
      .first();

    if (existing) {
      await db('push_subscriptions')
        .where({ id: existing.id })
        .update({
          p256dh,
          auth,
          updated_at: new Date(),
        });
    } else {
      await db('push_subscriptions').insert({
        user_id: String(userId),
        endpoint,
        p256dh,
        auth,
        created_at: new Date(),
        updated_at: new Date(),
      });
    }

    logger.info(`Push subscription saved for user ${userId}`);
    return true;
  } catch (err) {
    logger.error('Failed to save push subscription:', err);
    return false;
  }
}

/**
 * Remove a push subscription for a user.
 * @param {string} userId
 * @param {string} endpoint
 */
async function removeSubscription(userId, endpoint) {
  if (!userId || !endpoint) return false;

  try {
    await db('push_subscriptions')
      .where({ user_id: String(userId), endpoint })
      .del();
    logger.info(`Push subscription removed for user ${userId}`);
    return true;
  } catch (err) {
    logger.error('Failed to remove push subscription:', err);
    return false;
  }
}

/**
 * Send a push notification to all of a user's subscribed devices.
 * @param {string} userId
 * @param {object} payload - { title, body, data, ... }
 */
async function sendPushNotification(userId, payload) {
  if (!userId || !payload) return 0;

  try {
    const subscriptions = await db('push_subscriptions')
      .where({ user_id: String(userId) })
      .select('endpoint', 'p256dh', 'auth');

    if (!subscriptions || subscriptions.length === 0) {
      return 0;
    }

    const pushPayload = JSON.stringify({
      title: payload.title || 'Care Master',
      body: payload.body || payload.message || '',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: payload.data || {},
      vibrate: [100, 50, 100],
      requireInteraction: payload.priority === 'high' || payload.priority === 'critical',
    });

    let sentCount = 0;
    const staleEndpoints = [];

    // Send to each subscription in parallel
    const sendPromises = subscriptions.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
        sentCount++;
      } catch (err) {
        // 410 = subscription is gone, 404 = not found — clean up stale
        if (err.statusCode === 410 || err.statusCode === 404) {
          staleEndpoints.push(sub.endpoint);
        } else {
          logger.warn(`Push send failed for ${sub.endpoint}:`, err.statusCode || err.message);
        }
      }
    });

    await Promise.all(sendPromises);

    // Clean up stale subscriptions
    if (staleEndpoints.length > 0) {
      await db('push_subscriptions')
        .whereIn('endpoint', staleEndpoints)
        .del();
      logger.info(`Cleaned up ${staleEndpoints.length} stale push subscriptions`);
    }

    return sentCount;
  } catch (err) {
    logger.error('sendPushNotification error:', err);
    return 0;
  }
}

module.exports = {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  sendPushNotification,
  initWebPush,
};
