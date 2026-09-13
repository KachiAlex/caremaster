/**
 * Notification Cleanup Job
 *
 * Runs periodically to:
 * 1. Auto-mark notifications older than 30 days as read (so the unread
 *    badge doesn't stay inflated forever).
 * 2. Delete notifications older than 90 days to prevent unbounded growth.
 *
 * Usage:
 *   const { startNotificationCleanup } = require('./jobs/notificationCleanup');
 *   startNotificationCleanup(); // runs every 24 hours
 *
 * Or run as a standalone script:
 *   node jobs/notificationCleanup.js
 */

const db = require('../utils/database');
const { logger } = require('../utils/logger');

const READ_AFTER_DAYS = 30;
const DELETE_AFTER_DAYS = 90;
const INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Run one cleanup cycle.
 * @returns {Promise<{ markedRead: number, deleted: number }>}
 */
async function cleanupNotifications() {
  const result = { markedRead: 0, deleted: 0 };

  try {
    // 1. Auto-mark notifications older than READ_AFTER_DAYS as read
    const readCutoff = new Date(Date.now() - READ_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const markedRead = await db('notifications')
      .where('read', false)
      .where('created_at', '<', readCutoff)
      .update({ read: true, read_at: new Date() });
    result.markedRead = markedRead || 0;

    if (result.markedRead > 0) {
      logger.info(`Notification cleanup: auto-marked ${result.markedRead} old notifications as read`);
    }

    // 2. Delete notifications older than DELETE_AFTER_DAYS
    const deleteCutoff = new Date(Date.now() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const deleted = await db('notifications')
      .where('created_at', '<', deleteCutoff)
      .del();
    result.deleted = deleted || 0;

    if (result.deleted > 0) {
      logger.info(`Notification cleanup: deleted ${result.deleted} notifications older than ${DELETE_AFTER_DAYS} days`);
    }

    if (result.markedRead === 0 && result.deleted === 0) {
      logger.info('Notification cleanup: nothing to clean');
    }
  } catch (err) {
    logger.error('Notification cleanup error:', err);
  }

  return result;
}

let cleanupTimer = null;

/**
 * Start the periodic cleanup job (every 24 hours).
 * Also runs once immediately on start.
 */
function startNotificationCleanup() {
  // Run immediately on startup
  cleanupNotifications().catch(() => {});

  // Schedule periodic runs
  cleanupTimer = setInterval(() => {
    cleanupNotifications().catch(() => {});
  }, INTERVAL_MS);

  logger.info(`Notification cleanup job started (every 24h, read-after=${READ_AFTER_DAYS}d, delete-after=${DELETE_AFTER_DAYS}d)`);
}

/**
 * Stop the periodic cleanup job.
 */
function stopNotificationCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
    logger.info('Notification cleanup job stopped');
  }
}

module.exports = {
  cleanupNotifications,
  startNotificationCleanup,
  stopNotificationCleanup,
  READ_AFTER_DAYS,
  DELETE_AFTER_DAYS,
};

// If run as a standalone script, execute once and exit
if (require.main === module) {
  cleanupNotifications()
    .then((result) => {
      console.log('Cleanup complete:', result);
      process.exit(0);
    })
    .catch((err) => {
      console.error('Cleanup failed:', err);
      process.exit(1);
    });
}
