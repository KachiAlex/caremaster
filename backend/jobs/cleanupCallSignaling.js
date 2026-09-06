const db = require('../utils/database');
const { logger } = require('../utils/logger');

/**
 * Cleanup old signaling and call notification records.
 *
 * These tables grow very quickly during calling and can bloat the database if
 * old messages are not removed. Completed/missed/rejected calls older than the
 * retention window are cleaned up, while 'calling' records are left alone.
 */
async function cleanupCallSignaling(retentionHours = 24) {
  try {
    const cutoff = new Date(Date.now() - retentionHours * 60 * 60 * 1000);

    const deletedCalls = await db('calls')
      .whereNot('status', 'calling')
      .where('updated_at', '<', cutoff)
      .orWhere(function() {
        this.whereNot('status', 'calling').whereNull('updated_at').where('created_at', '<', cutoff);
      })
      .delete();

    const deletedNotifications = await db('call_notifications')
      .whereNot('status', 'calling')
      .where('updated_at', '<', cutoff)
      .orWhere(function() {
        this.whereNot('status', 'calling').whereNull('updated_at').where('created_at', '<', cutoff);
      })
      .delete();

    const deletedSignaling = await db('signaling')
      .where('created_at', '<', cutoff)
      .delete();

    logger.info(
      `Call retention cleanup complete: calls=${deletedCalls}, notifications=${deletedNotifications}, signaling=${deletedSignaling}`
    );
  } catch (error) {
    logger.error('Call retention cleanup failed:', error);
  }
}

module.exports = { cleanupCallSignaling };
