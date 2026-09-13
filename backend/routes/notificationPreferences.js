/**
 * Notification Preferences Route
 *
 * GET  /api/notifications/preferences/:userId  — fetch preferences
 * PUT  /api/notifications/preferences/:userId  — update preferences
 *
 * Preferences are stored as a jsonb column on the users table:
 *   notification_preferences: {
 *     appointment_reminders: true,
 *     care_request_alerts: true,
 *     vital_sign_alerts: true,
 *     message_notifications: true,
 *     task_assignments: true,
 *     prescription_updates: true,
 *     system_updates: false,
 *   }
 *
 * The notification dispatcher checks these before creating a notification.
 */

const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const db = require('../utils/database');
const { logger } = require('../utils/logger');

const router = express.Router();

router.use(authenticateToken);

// Default preferences for new users
const DEFAULT_PREFERENCES = {
  appointment_reminders: true,
  care_request_alerts: true,
  vital_sign_alerts: true,
  message_notifications: true,
  task_assignments: true,
  prescription_updates: true,
  consultation_updates: true,
  care_log_updates: true,
  system_updates: false,
};

// Map notification types to preference keys
const TYPE_TO_PREFERENCE = {
  appointment: 'appointment_reminders',
  task: 'task_assignments',
  consultation: 'consultation_updates',
  message: 'message_notifications',
  emergency: 'vital_sign_alerts',
  prescription: 'prescription_updates',
  medication: 'prescription_updates',
  diagnostic: 'care_request_alerts',
  pharmacy: 'care_request_alerts',
  system: 'system_updates',
};

/**
 * Get notification preferences for a user.
 * Users can only fetch their own preferences unless they're an admin.
 */
router.get('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorization: users can only fetch their own preferences
    if (req.user.id !== userId && !isAdmin(req.user.user_type)) {
      return res.status(403).json({ success: false, message: 'You can only view your own notification preferences' });
    }

    const user = await db('users').where({ id: userId }).select('notification_preferences').first();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const prefs = user.notification_preferences
      ? (typeof user.notification_preferences === 'string'
          ? JSON.parse(user.notification_preferences)
          : user.notification_preferences)
      : { ...DEFAULT_PREFERENCES };

    res.json({ success: true, data: { ...DEFAULT_PREFERENCES, ...prefs } });
  } catch (error) {
    logger.error('Failed to fetch notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch preferences' });
  }
});

/**
 * Update notification preferences for a user.
 * Users can only update their own preferences.
 */
router.put('/preferences/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Authorization: users can only update their own preferences
    if (req.user.id !== userId) {
      return res.status(403).json({ success: false, message: 'You can only update your own notification preferences' });
    }

    // Merge incoming preferences with defaults (only allow known keys)
    const incoming = req.body || {};
    const merged = { ...DEFAULT_PREFERENCES };
    for (const key of Object.keys(DEFAULT_PREFERENCES)) {
      if (typeof incoming[key] === 'boolean') {
        merged[key] = incoming[key];
      }
    }

    await db('users').where({ id: userId }).update({
      notification_preferences: JSON.stringify(merged),
      updated_at: new Date(),
    });

    res.json({ success: true, data: merged });
  } catch (error) {
    logger.error('Failed to update notification preferences:', error);
    res.status(500).json({ success: false, message: 'Failed to update preferences' });
  }
});

/**
 * Check if a user should receive a notification of a given type.
 * Returns true if the user's preferences allow it, or if preferences
 * are not set (defaults to true for most types).
 *
 * Exported for use by notificationDispatcher.js
 */
async function shouldNotify(userId, notificationType) {
  if (!userId || !notificationType) return true;

  try {
    const user = await db('users').where({ id: String(userId) }).select('notification_preferences').first();
    if (!user) return true;

    const prefs = user.notification_preferences
      ? (typeof user.notification_preferences === 'string'
          ? JSON.parse(user.notification_preferences)
          : user.notification_preferences)
      : null;

    if (!prefs) return true;

    const prefKey = TYPE_TO_PREFERENCE[notificationType];
    if (!prefKey) return true; // Unknown types default to allowed

    // If the preference is explicitly set to false, suppress
    if (prefs[prefKey] === false) return false;

    return true;
  } catch (err) {
    // On error, default to allowing the notification
    return true;
  }
}

function isAdmin(userType) {
  return ['admin', 'institution-admin', 'institution_admin', 'InstitutionAdmin', 'super-admin', 'superadmin', 'super_admin'].includes(userType);
}

module.exports = router;
module.exports.shouldNotify = shouldNotify;
module.exports.DEFAULT_PREFERENCES = DEFAULT_PREFERENCES;
module.exports.TYPE_TO_PREFERENCE = TYPE_TO_PREFERENCE;
