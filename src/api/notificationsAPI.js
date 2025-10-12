import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const NOTIFICATIONS_COLLECTION = 'notifications';

// Notification types
export const NOTIFICATION_TYPES = {
  APPOINTMENT: 'appointment',
  TASK: 'task',
  MESSAGE: 'message',
  MEDICAL: 'medical',
  EMERGENCY: 'emergency',
  SYSTEM: 'system',
  REMINDER: 'reminder',
  CAREGIVER_ONBOARDING: 'caregiver_onboarding',
  NEW_TASK_ASSIGNED: 'new_task_assigned',
  TASK_DUE_SOON: 'task_due_soon',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  PATIENT_UPDATE: 'patient_update',
  CARE_LOG_ADDED: 'care_log_added'
};

// Notification priorities
export const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Create a notification
export const createNotification = async (notificationData) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const newNotification = {
      ...notificationData,
      read: false,
      createdAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(notificationsRef, newNotification);
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

// Get notifications for a user
export const getNotificationsByUser = async (userId, limitCount = 50) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      const notificationData = doc.data();
      notifications.push({
        id: doc.id,
        ...notificationData,
        createdAt: notificationData.createdAt?.toDate?.() || notificationData.createdAt,
      });
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

// Get unread notifications count
export const getUnreadNotificationCount = async (userId) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    throw error;
  }
};

// Mark notification as read
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await updateDoc(notificationRef, {
      read: true,
      readAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const querySnapshot = await getDocs(q);
    const updatePromises = [];
    
    querySnapshot.forEach((doc) => {
      updatePromises.push(
        updateDoc(doc.ref, {
          read: true,
          readAt: serverTimestamp(),
        })
      );
    });
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

// Delete notification
export const deleteNotification = async (notificationId) => {
  try {
    const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
    await deleteDoc(notificationRef);
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    throw error;
  }
};

// Get notifications by type
export const getNotificationsByType = async (userId, type) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('type', '==', type),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      const notificationData = doc.data();
      notifications.push({
        id: doc.id,
        ...notificationData,
        createdAt: notificationData.createdAt?.toDate?.() || notificationData.createdAt,
      });
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications by type:', error);
    throw error;
  }
};

// Get notifications by priority
export const getNotificationsByPriority = async (userId, priority) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('userId', '==', userId),
      where('priority', '==', priority),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const notifications = [];
    querySnapshot.forEach((doc) => {
      const notificationData = doc.data();
      notifications.push({
        id: doc.id,
        ...notificationData,
        createdAt: notificationData.createdAt?.toDate?.() || notificationData.createdAt,
      });
    });
    
    return notifications;
  } catch (error) {
    console.error('Error fetching notifications by priority:', error);
    throw error;
  }
};

// Send notification to multiple users
export const sendNotificationToUsers = async (userIds, notificationData) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const createPromises = [];
    
    for (const userId of userIds) {
      const notification = {
        ...notificationData,
        userId,
        read: false,
        createdAt: serverTimestamp(),
      };
      createPromises.push(addDoc(notificationsRef, notification));
    }
    
    await Promise.all(createPromises);
    return true;
  } catch (error) {
    console.error('Error sending notifications to users:', error);
    throw error;
  }
};

// Send appointment reminder
export const sendAppointmentReminder = async (appointmentData) => {
  try {
    const { patientId, doctorId, caregiverId, scheduledTime, type } = appointmentData;
    const usersToNotify = [];
    
    if (patientId) usersToNotify.push(patientId);
    if (doctorId) usersToNotify.push(doctorId);
    if (caregiverId) usersToNotify.push(caregiverId);
    
    const reminderData = {
      title: 'Appointment Reminder',
      message: `You have an appointment ${type} scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      type: NOTIFICATION_TYPES.APPOINTMENT,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      metadata: {
        appointmentId: appointmentData.id,
        scheduledTime: scheduledTime,
        type: type
      }
    };
    
    await sendNotificationToUsers(usersToNotify, reminderData);
    return true;
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    throw error;
  }
};

// Send task reminder
export const sendTaskReminder = async (taskData) => {
  try {
    const { caregiverId, patientId, scheduledTime, title } = taskData;
    const usersToNotify = [caregiverId];
    
    if (patientId) usersToNotify.push(patientId);
    
    const reminderData = {
      title: 'Task Reminder',
      message: `You have a task "${title}" scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      type: NOTIFICATION_TYPES.TASK,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      metadata: {
        taskId: taskData.id,
        scheduledTime: scheduledTime,
        title: title
      }
    };
    
    await sendNotificationToUsers(usersToNotify, reminderData);
    return true;
  } catch (error) {
    console.error('Error sending task reminder:', error);
    throw error;
  }
};

// Send emergency notification
export const sendEmergencyNotification = async (emergencyData) => {
  try {
    const { patientId, message, priority = NOTIFICATION_PRIORITIES.URGENT } = emergencyData;
    
    // Get all users associated with the patient
    const usersToNotify = [patientId]; // This would be expanded to include caregivers, doctors, etc.
    
    const notificationData = {
      title: 'Emergency Alert',
      message: message,
      type: NOTIFICATION_TYPES.EMERGENCY,
      priority: priority,
      metadata: emergencyData
    };
    
    await sendNotificationToUsers(usersToNotify, notificationData);
    return true;
  } catch (error) {
    console.error('Error sending emergency notification:', error);
    throw error;
  }
};

// Send new message notification
export const sendNewMessageNotification = async (messageData) => {
  try {
    const { conversationId, senderId, recipientId, messageText } = messageData;
    
    const notificationData = {
      title: 'New Message',
      message: `You received a new message: ${messageText.substring(0, 50)}...`,
      type: NOTIFICATION_TYPES.MESSAGE,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      metadata: {
        conversationId,
        senderId,
        messageText
      }
    };
    
    await createNotification({
      ...notificationData,
      userId: recipientId
    });
    
    return true;
  } catch (error) {
    console.error('Error sending new message notification:', error);
    throw error;
  }
};

// Schedule reminder notification
export const scheduleReminderNotification = async (userId, reminderData) => {
  try {
    const { title, message, scheduledTime, type = NOTIFICATION_TYPES.REMINDER } = reminderData;
    
    const notificationData = {
      title: title,
      message: message,
      type: type,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      scheduledTime: Timestamp.fromDate(new Date(scheduledTime)),
      metadata: reminderData
    };
    
    await createNotification({
      ...notificationData,
      userId
    });
    
    return true;
  } catch (error) {
    console.error('Error scheduling reminder notification:', error);
    throw error;
  }
};



// Clean up old notifications
export const cleanupOldNotifications = async (daysOld = 30) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(
      notificationsRef,
      where('createdAt', '<', Timestamp.fromDate(cutoffDate)),
      where('read', '==', true)
    );
    
    const querySnapshot = await getDocs(q);
    const deletePromises = [];
    
    querySnapshot.forEach((doc) => {
      deletePromises.push(deleteDoc(doc.ref));
    });
    
    await Promise.all(deletePromises);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error cleaning up old notifications:', error);
    throw error;
  }
};

// Real-time subscription for notifications
export const subscribeToNotifications = (userId, callback, options = {}) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    let q = query(
      notificationsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    // Add read status filtering if provided
    if (options.read !== undefined) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('read', '==', options.read),
        orderBy('createdAt', 'desc')
      );
    }

    // Add type filtering if provided
    if (options.type) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('type', '==', options.type),
        orderBy('createdAt', 'desc')
      );
    }

    // Add priority filtering if provided
    if (options.priority) {
      q = query(
        notificationsRef,
        where('userId', '==', userId),
        where('priority', '==', options.priority),
        orderBy('createdAt', 'desc')
      );
    }

    // Add limit if provided
    if (options.limit) {
      q = query(q, limit(options.limit));
    }

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const notifications = [];
      querySnapshot.forEach((doc) => {
        const notificationData = doc.data();
        notifications.push({
          id: doc.id,
          ...notificationData,
          createdAt: notificationData.createdAt?.toDate?.() || notificationData.createdAt,
        });
      });
      callback(notifications);
    }, (error) => {
      console.error('Error in real-time notification subscription:', error);
      callback([]);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up real-time notification subscription:', error);
    throw error;
  }
};

// Create notification for new task assignment
export const createTaskAssignmentNotification = async (caregiverId, taskData) => {
  try {
    const notificationData = {
      userId: caregiverId,
      type: NOTIFICATION_TYPES.NEW_TASK_ASSIGNED,
      title: 'New Task Assigned',
      message: `You have been assigned a new task: ${taskData.title || 'Care Task'}`,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      data: {
        taskId: taskData.id,
        patientId: taskData.patientId,
        scheduledTime: taskData.scheduledTime,
        type: 'task_assignment'
      },
      read: false,
      createdAt: serverTimestamp(),
    };
    
    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error creating task assignment notification:', error);
    throw error;
  }
};

// Create notification for appointment reminder
export const createAppointmentReminderNotification = async (userId, appointmentData) => {
  try {
    const notificationData = {
      userId: userId,
      type: NOTIFICATION_TYPES.APPOINTMENT_REMINDER,
      title: 'Appointment Reminder',
      message: `You have an appointment scheduled: ${appointmentData.title || 'Medical Appointment'}`,
      priority: NOTIFICATION_PRIORITIES.MEDIUM,
      data: {
        appointmentId: appointmentData.id,
        patientId: appointmentData.patientId,
        scheduledTime: appointmentData.scheduledTime,
        type: 'appointment_reminder'
      },
      read: false,
      createdAt: serverTimestamp(),
    };
    
    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error creating appointment reminder notification:', error);
    throw error;
  }
};

// Create notification for task due soon
export const createTaskDueSoonNotification = async (caregiverId, taskData) => {
  try {
    const notificationData = {
      userId: caregiverId,
      type: NOTIFICATION_TYPES.TASK_DUE_SOON,
      title: 'Task Due Soon',
      message: `Task "${taskData.title || 'Care Task'}" is due soon`,
      priority: NOTIFICATION_PRIORITIES.HIGH,
      data: {
        taskId: taskData.id,
        patientId: taskData.patientId,
        scheduledTime: taskData.scheduledTime,
        type: 'task_due_soon'
      },
      read: false,
      createdAt: serverTimestamp(),
    };
    
    return await createNotification(notificationData);
  } catch (error) {
    console.error('Error creating task due soon notification:', error);
    throw error;
  }
};

// Get notification statistics
export const getNotificationStats = async (userId) => {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    const q = query(notificationsRef, where('userId', '==', userId));
    
    const querySnapshot = await getDocs(q);
    const notifications = [];
    
    querySnapshot.forEach((doc) => {
      const notificationData = doc.data();
      notifications.push({
        id: doc.id,
        ...notificationData,
        createdAt: notificationData.createdAt?.toDate?.() || notificationData.createdAt,
      });
    });
    
    const totalNotifications = notifications.length;
    const unreadNotifications = notifications.filter(n => !n.read).length;
    const readNotifications = notifications.filter(n => n.read).length;
    
    // Group by type
    const notificationsByType = {};
    notifications.forEach(notification => {
      const type = notification.type || 'unknown';
      notificationsByType[type] = (notificationsByType[type] || 0) + 1;
    });
    
    // Group by priority
    const notificationsByPriority = {};
    notifications.forEach(notification => {
      const priority = notification.priority || 'medium';
      notificationsByPriority[priority] = (notificationsByPriority[priority] || 0) + 1;
    });
    
    return {
      totalNotifications,
      unreadNotifications,
      readNotifications,
      notificationsByType,
      notificationsByPriority
    };
  } catch (error) {
    console.error('Error fetching notification stats:', error);
    throw error;
  }
};

// Bulk mark notifications as read
export const bulkMarkNotificationsAsRead = async (notificationIds, userId) => {
  try {
    const updatePromises = notificationIds.map(notificationId => {
      const notificationRef = doc(db, NOTIFICATIONS_COLLECTION, notificationId);
      return updateDoc(notificationRef, {
        read: true,
        readAt: serverTimestamp()
      });
    });
    
    await Promise.all(updatePromises);
    return { success: true, updatedCount: notificationIds.length };
  } catch (error) {
    console.error('Error bulk marking notifications as read:', error);
    throw error;
  }
};
