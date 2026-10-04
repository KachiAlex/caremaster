const db = require('../utils/database');
const { logger } = require('../utils/logger');

/**
 * Cleanup old signaling/call notification records and reconcile stale calls.
 *
 * - `signaling` rows are pure WebRTC transport garbage — safe to delete.
 * - `calls` rows are the user's call HISTORY — never deleted. Rows stuck in
 *   transient states (crashed/abandoned tabs) are marked missed/ended.
 * - `call_notifications`: pending ones past the ring window become 'missed';
 *   resolved ones are pruned after NOTIFICATION_RETENTION_DAYS.
 */
const NOTIFICATION_RETENTION_DAYS = 30;
const STALE_RING_HOURS = 2;    // nobody rings for 2h — the caller is gone
const STALE_ACTIVE_HOURS = 6;  // no real call stays 'answered' for 6h without updates

async function cleanupCallSignaling(retentionHours = 24) {
  try {
    const now = Date.now();
    const signalingCutoff = new Date(now - retentionHours * 60 * 60 * 1000);
    const staleRing = new Date(now - STALE_RING_HOURS * 60 * 60 * 1000);
    const staleActive = new Date(now - STALE_ACTIVE_HOURS * 60 * 60 * 1000);
    const notificationCutoff = new Date(now - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    const lastTouchedBefore = (qb, cutoff) =>
      qb.where(function() {
        this.where('updated_at', '<', cutoff)
          .orWhere(function() {
            this.whereNull('updated_at').where('created_at', '<', cutoff);
          });
      });

    // Expire calls stuck mid-ring or mid-call (browser crash, dropped network)
    const missedCalls = await lastTouchedBefore(
      db('calls').whereIn('status', ['initiating', 'calling', 'ringing']),
      staleRing
    ).update({ status: 'missed', updated_at: new Date() });

    const hungUpCalls = await lastTouchedBefore(
      db('calls').whereIn('status', ['answered', 'active', 'in-progress', 'connected']),
      staleActive
    ).update({ status: 'ended', updated_at: new Date() });

    // Pending notifications older than the ring window are stale too
    const staleNotifications = await lastTouchedBefore(
      db('call_notifications').whereIn('status', ['incoming', 'calling', 'ringing', 'pending']),
      staleRing
    ).update({ status: 'missed', updated_at: new Date() });

    // Resolved notifications are pruned after the retention window
    const deletedNotifications = await db('call_notifications')
      .whereNotIn('status', ['incoming', 'calling', 'ringing', 'pending'])
      .where(function() {
        this.where('updated_at', '<', notificationCutoff)
          .orWhere(function() {
            this.whereNull('updated_at').where('created_at', '<', notificationCutoff);
          });
      })
      .delete();

    const deletedSignaling = await db('signaling')
      .where('created_at', '<', signalingCutoff)
      .delete();

    logger.info(
      `Call cleanup: missedCalls=${missedCalls}, hungUpCalls=${hungUpCalls}, ` +
      `staleNotifications=${staleNotifications}, deletedNotifications=${deletedNotifications}, ` +
      `deletedSignaling=${deletedSignaling}`
    );
  } catch (error) {
    logger.error('Call retention cleanup failed:', error);
  }
}

module.exports = { cleanupCallSignaling };
