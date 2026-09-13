/**
 * Notification Preferences API
 *
 * Fetches and updates per-user notification mute preferences.
 */

import api from './config';

const BASE_URL = '/api/notifications/preferences';

/**
 * Get notification preferences for a user.
 * @param {string} userId
 * @returns {Promise<Object>} preferences object
 */
export const getNotificationPreferences = async (userId) => {
  if (!userId) return null;
  try {
    const response = await api.get(`${BASE_URL}/${userId}`);
    return response.data?.data || null;
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    return null;
  }
};

/**
 * Update notification preferences for a user.
 * @param {string} userId
 * @param {Object} preferences - { appointment_reminders: true, ... }
 * @returns {Promise<Object>} updated preferences
 */
export const updateNotificationPreferences = async (userId, preferences) => {
  if (!userId) return null;
  try {
    const response = await api.put(`${BASE_URL}/${userId}`, preferences);
    return response.data?.data || null;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

// Default preferences (mirror the backend)
export const DEFAULT_NOTIFICATION_PREFERENCES = {
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

// Human-readable labels for each preference
export const PREFERENCE_LABELS = {
  appointment_reminders: 'Appointment Reminders',
  care_request_alerts: 'Care Request Alerts',
  vital_sign_alerts: 'Vital Sign Alerts',
  message_notifications: 'Message Notifications',
  task_assignments: 'Task Assignment Alerts',
  prescription_updates: 'Prescription Updates',
  consultation_updates: 'Consultation Updates',
  care_log_updates: 'Care Log Updates',
  system_updates: 'System Updates',
};

export default {
  getNotificationPreferences,
  updateNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PREFERENCE_LABELS,
};
