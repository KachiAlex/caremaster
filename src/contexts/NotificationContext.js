/**
 * NotificationContext
 *
 * Subscribes to real-time notifications once at the layout level and exposes
 * { notifications, unreadCount, markAsRead, markAllAsRead, refresh } to all
 * child components. Also fires a toast for new high/critical priority
 * notifications, bridging the gap between ephemeral toasts and persistent
 * bell-badge notifications.
 *
 * Usage:
 *   import { NotificationProvider, useNotifications } from '../contexts/NotificationContext';
 *   // Wrap at the layout level:
 *   <NotificationProvider userId={userProfile.id}>
 *     <Dashboard />
 *   </NotificationProvider>
 *   // Consume in any child:
 *   const { unreadCount, notifications } = useNotifications();
 */

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import {
  notificationsAPI,
  subscribeToNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearAllNotifications,
} from '../api/notificationsAPI';

const NotificationContext = createContext(null);

export const useNotifications = () => {
  const ctx = useContext(NotificationContext);
  return ctx || { notifications: [], unreadCount: 0, markAsRead: () => {}, markAllAsRead: () => {} };
};

export const NotificationProvider = ({ userId, children }) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const prevNotifIdsRef = useRef(new Set());

  useEffect(() => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    let unsubscribe = null;

    // Subscribe to real-time notification updates
    unsubscribe = subscribeToNotifications(userId, (notifs) => {
      setNotifications(notifs);
      const unread = notifs.filter((n) => !n.read).length;
      setUnreadCount(unread);
      setLoading(false);

      // Fire a toast for genuinely new high/critical notifications
      // (not present in the previous snapshot)
      const newHighPriority = notifs.filter((n) => {
        if (n.read) return false;
        const priority = (n.priority || '').toLowerCase();
        if (priority !== 'high' && priority !== 'critical' && priority !== 'urgent') return false;
        return !prevNotifIdsRef.current.has(n.id);
      });

      newHighPriority.forEach((n) => {
        toast.info(`${n.title || 'New notification'}: ${n.message || ''}`, {
          autoClose: 8000,
        });
      });

      // Update the seen-IDs set for next diff
      prevNotifIdsRef.current = new Set(notifs.map((n) => n.id));
    });

    // Also fetch initial unread count
    getUnreadNotificationCount(userId)
      .then((count) => setUnreadCount(count || 0))
      .catch(() => setUnreadCount(0))
      .finally(() => setLoading(false));

    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [userId]);

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('NotificationContext.markAsRead error:', err);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead(userId);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('NotificationContext.markAllAsRead error:', err);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId) return;
    try {
      const notifs = await notificationsAPI.getNotifications(userId);
      setNotifications(notifs);
      setUnreadCount(notifs.filter((n) => !n.read).length);
    } catch (err) {
      console.error('NotificationContext.refresh error:', err);
    }
  }, [userId]);

  const clearAll = useCallback(async () => {
    if (!userId) return;
    try {
      await clearAllNotifications(userId);
      setNotifications((prev) => prev.filter((n) => !n.read));
    } catch (err) {
      console.error('NotificationContext.clearAll error:', err);
    }
  }, [userId]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearAll,
    refresh,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
