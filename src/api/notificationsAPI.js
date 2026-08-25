import { db } from '../backend/config';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp
} from 'backend/database';

const NOTIFICATIONS_COLLECTION = 'notifications';

// Notification types and priorities constants
export const NOTIFICATION_TYPES = {
  TASK: 'task',
  PRESCRIPTION: 'prescription',
  CONSULTATION: 'consultation',
  DIAGNOSTIC: 'diagnostic',
  PHARMACY: 'pharmacy',
  APPOINTMENT: 'appointment',
  MEDICATION: 'medication',
  EMERGENCY: 'emergency',
  SYSTEM: 'system'
};

export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Legacy function names for backward compatibility
export const createNotification = async (notificationData) => {
  return await notificationsAPI.createNotification(notificationData);
};

export const subscribeToNotifications = (userId, callback) => {
  return notificationsAPI.subscribeToNotifications(userId, callback);
};

export const getNotifications = async (userId, limitCount = 50) => {
  return await notificationsAPI.getNotifications(userId, limitCount);
};

export const markAsRead = async (notificationId) => {
  return await notificationsAPI.markAsRead(notificationId);
};

export const getUnreadNotificationCount = async (userId) => {
  return await notificationsAPI.getUnreadCount(userId);
};

export const markNotificationAsRead = async (notificationId) => {
  return await notificationsAPI.markAsRead(notificationId);
};

export const markAllNotificationsAsRead = async (userId) => {
  return await notificationsAPI.markAllAsRead(userId);
};

export const notificationsAPI = {
  // Create a new notification
  createNotification: async (notificationData) => {
    try {
      const notification = {
        ...notificationData,
        read: false,
        createdAt: serverTimestamp(),
        timestamp: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, NOTIFICATIONS_COLLECTION), notification);
      console.log('✅ Notification created:', docRef.id);
      return { id: docRef.id, ...notification };
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  },

  // Get notifications for a user
  getNotifications: async (userId, limitCount = 50) => {
    try {
      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications:', error);
      throw error;
    }
  },

  // Get unread notifications count
  getUnreadCount: async (userId) => {
    try {
      const unreadQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(unreadQuery);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      throw error;
    }
  },

  // Mark notification as read
  markAsRead: async (notificationId) => {
    try {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  // Mark all notifications as read for a user
  markAllAsRead: async (userId) => {
    try {
      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('read', '==', false)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const updatePromises = querySnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp()
        })
      );

      await Promise.all(updatePromises);
      return true;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  // Delete notification
  deleteNotification: async (notificationId) => {
    try {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      await deleteDoc(notificationRef);
      return true;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  // Subscribe to notifications for real-time updates
  subscribeToNotifications: (userId, callback) => {
    const notificationsQuery = query(
      collection(db, NOTIFICATIONS_COLLECTION),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(notificationsQuery, (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      callback(notifications);
    });
  },

  // Get notifications by type
  getNotificationsByType: async (userId, type, limitCount = 20) => {
    try {
      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('type', '==', type),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching notifications by type:', error);
      throw error;
    }
  },

  // Get high priority notifications
  getHighPriorityNotifications: async (userId, limitCount = 10) => {
    try {
      const notificationsQuery = query(
        collection(db, NOTIFICATIONS_COLLECTION),
        where('userId', '==', userId),
        where('priority', '==', 'high'),
        where('read', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(notificationsQuery);
      const notifications = [];

      querySnapshot.forEach((doc) => {
        notifications.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return notifications;
    } catch (error) {
      console.error('Error fetching high priority notifications:', error);
      throw error;
    }
  }
};

export default notificationsAPI;