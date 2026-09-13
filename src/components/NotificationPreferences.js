/**
 * NotificationPreferences
 *
 * A settings panel that lets users mute/unmute notification categories.
 * Can be embedded in any settings page or modal.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Bell, BellOff, Save, Loader } from 'lucide-react';
import { toast } from 'react-toastify';
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  PREFERENCE_LABELS,
} from '../api/notificationPreferencesAPI';

const NotificationPreferences = ({ userId }) => {
  const [preferences, setPreferences] = useState(DEFAULT_NOTIFICATION_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const prefs = await getNotificationPreferences(userId);
      if (!cancelled && prefs) {
        setPreferences(prefs);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [userId]);

  const handleToggle = useCallback((key) => {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!userId) return;
    setSaving(true);
    try {
      await updateNotificationPreferences(userId, preferences);
      toast.success('Notification preferences saved');
    } catch (err) {
      toast.error('Failed to save preferences');
    } finally {
      setSaving(false);
    }
  }, [userId, preferences]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Bell className="h-5 w-5 mr-2 text-blue-600" />
            Notification Preferences
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Choose which notifications you want to receive.
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save
        </button>
      </div>

      <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 overflow-hidden">
        {Object.keys(DEFAULT_NOTIFICATION_PREFERENCES).map((key) => {
          const enabled = preferences[key] !== false;
          return (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                {enabled ? (
                  <Bell className="h-4 w-4 text-blue-500" />
                ) : (
                  <BellOff className="h-4 w-4 text-gray-300" />
                )}
                <span className={`text-sm font-medium ${enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                  {PREFERENCE_LABELS[key] || key}
                </span>
              </div>
              <button
                onClick={() => handleToggle(key)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-blue-600' : 'bg-gray-200'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationPreferences;
