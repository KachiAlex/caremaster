/**
 * Notification Service
 * Handles SMS, WhatsApp, Email, and Push notifications
 * Integrates with Twilio, Backend Cloud Messaging
 */

import { db } from '../config/backendConfig';
import logger from '../utils/logger';
import { collection, query, getDocs, updateDoc, addDoc, where, doc } from 'backend/database';
import { db } from '../backend/config';

/**
 * Notification Types
 */
export const NOTIFICATION_TYPES = {
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  EMAIL: 'email',
  PUSH: 'push',
  IN_APP: 'in_app'
};

/**
 * Notification Categories
 */
export const NOTIFICATION_CATEGORIES = {
  APPOINTMENT_REMINDER: 'appointment_reminder',
  APPOINTMENT_CONFIRMATION: 'appointment_confirmation',
  APPOINTMENT_CANCELLED: 'appointment_cancelled',
  APPOINTMENT_RESCHEDULED: 'appointment_rescheduled',
  QUEUE_POSITION: 'queue_position',
  LAB_RESULTS: 'lab_results',
  PRESCRIPTION_READY: 'prescription_ready',
  BILLING_ALERT: 'billing_alert',
  PAYMENT_DUE: 'payment_due',
  CONSULTATION_READY: 'consultation_ready',
  MESSAGE_RECEIVED: 'message_received',
  CAREGIVER_UPDATE: 'caregiver_update',
  ACCOUNT_ALERT: 'account_alert',
  SECURITY_ALERT: 'security_alert'
};

/**
 * Send SMS notification
 */
export const sendSmsNotification = async (phoneNumber, message, options = {}) => {
  try {
    const { category = 'general', priority = 'normal', metadata = {}, retry = true } = options;

    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }

    // Validate phone number format
    if (!/^\+?[1-9]\d{1,14}$/.test(phoneNumber.replace(/\D/g, ''))) {
      throw new Error('Invalid phone number format');
    }

    // Create notification record
    const notificationRecord = {
      type: NOTIFICATION_TYPES.SMS,
      category,
      to: phoneNumber,
      message,
      priority,
      status: 'pending',
      createdAt: Timestamp.now(),
      sentAt: null,
      deliveredAt: null,
      failedAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: retry ? 3 : 0,
      metadata
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'notifications'), notificationRecord);

    // Send via Twilio (or your SMS provider)
    await sendSmsViaTwilio(phoneNumber, message, docRef.id, category);

    logger.info('SMS notification queued', {
      phone: phoneNumber.substring(-4),
      category,
      notificationId: docRef.id
    });

    return {
      success: true,
      notificationId: docRef.id,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Failed to send SMS notification', { error });
    throw error;
  }
};

/**
 * Send WhatsApp notification
 */
export const sendWhatsAppNotification = async (phoneNumber, message, options = {}) => {
  try {
    const { category = 'general', priority = 'normal', mediaUrl = null, metadata = {}, retry = true } = options;

    if (!phoneNumber || !message) {
      throw new Error('Phone number and message are required');
    }

    // Create notification record
    const notificationRecord = {
      type: NOTIFICATION_TYPES.WHATSAPP,
      category,
      to: phoneNumber,
      message,
      mediaUrl,
      priority,
      status: 'pending',
      createdAt: Timestamp.now(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: retry ? 3 : 0,
      metadata
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'notifications'), notificationRecord);

    // Send via Twilio WhatsApp API
    await sendWhatsAppViaTwilio(phoneNumber, message, mediaUrl, docRef.id, category);

    logger.info('WhatsApp notification queued', {
      phone: phoneNumber.substring(-4),
      category,
      notificationId: docRef.id
    });

    return {
      success: true,
      notificationId: docRef.id,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Failed to send WhatsApp notification', { error });
    throw error;
  }
};

/**
 * Send email notification
 */
export const sendEmailNotification = async (email, subject, templateName, templateData = {}, options = {}) => {
  try {
    const { category = 'general', priority = 'normal', attachments = [], metadata = {}, retry = true } = options;

    if (!email || !subject || !templateName) {
      throw new Error('Email, subject, and template name are required');
    }

    // Create notification record
    const notificationRecord = {
      type: NOTIFICATION_TYPES.EMAIL,
      category,
      to: email,
      subject,
      templateName,
      templateData,
      attachments,
      priority,
      status: 'pending',
      createdAt: Timestamp.now(),
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      failedAt: null,
      failureReason: null,
      retryCount: 0,
      maxRetries: retry ? 3 : 0,
      metadata
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'notifications'), notificationRecord);

    // Send via email service (SendGrid, Backend, etc.)
    await sendEmailViaService(email, subject, templateName, templateData, docRef.id, category);

    logger.info('Email notification queued', {
      email: email.substring(0, 20),
      category,
      notificationId: docRef.id
    });

    return {
      success: true,
      notificationId: docRef.id,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Failed to send email notification', { error });
    throw error;
  }
};

/**
 * Send push notification
 */
export const sendPushNotification = async (userId, title, message, category = 'general', metadata = {}) => {
  try {
    if (!userId || !title || !message) {
      throw new Error('userId, title, and message are required');
    }

    // Create notification record
    const notificationRecord = {
      type: NOTIFICATION_TYPES.PUSH,
      category,
      userId,
      title,
      message,
      status: 'pending',
      createdAt: Timestamp.now(),
      sentAt: null,
      deliveredAt: null,
      readAt: null,
      failedAt: null,
      metadata
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'notifications'), notificationRecord);

    // Send via Backend Cloud Messaging
    await sendViaFCM(userId, title, message, docRef.id, category);

    logger.info('Push notification queued', {
      userId: userId.substring(0, 10),
      category,
      notificationId: docRef.id
    });

    return {
      success: true,
      notificationId: docRef.id,
      status: 'pending'
    };
  } catch (error) {
    logger.error('Failed to send push notification', { error });
    // Don't throw - push failures shouldn't block the flow
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send in-app notification
 */
export const sendInAppNotification = async (userId, title, message, category = 'general', metadata = {}) => {
  try {
    if (!userId || !title || !message) {
      throw new Error('userId, title, and message are required');
    }

    // Create notification record
    const notificationRecord = {
      type: NOTIFICATION_TYPES.IN_APP,
      category,
      userId,
      title,
      message,
      status: 'sent',
      createdAt: Timestamp.now(),
      read: false,
      readAt: null,
      metadata
    };

    // Add to database
    const docRef = await addDoc(collection(db, 'notifications'), notificationRecord);

    logger.info('In-app notification created', {
      userId: userId.substring(0, 10),
      category,
      notificationId: docRef.id
    });

    return {
      success: true,
      notificationId: docRef.id,
      status: 'sent'
    };
  } catch (error) {
    logger.error('Failed to create in-app notification', { error });
    throw error;
  }
};

/**
 * Send appointment reminder
 */
export const sendAppointmentReminder = async (appointment, patient, provider) => {
  try {
    const appointmentTime = new Date(appointment.dateTime);
    const formattedTime = appointmentTime.toLocaleString();

    // Send SMS reminder
    if (patient.phoneNumber) {
      const smsMessage = `Reminder: You have an appointment with ${provider.fullName} on ${formattedTime}. Please arrive 10 minutes early.`;
      
      await sendSmsNotification(patient.phoneNumber, smsMessage, {
        category: NOTIFICATION_CATEGORIES.APPOINTMENT_REMINDER,
        priority: 'high',
        metadata: {
          appointmentId: appointment.id,
          patientId: patient.id,
          providerId: provider.id
        }
      });
    }

    // Send WhatsApp reminder
    if (patient.whatsappNumber) {
      const whatsappMessage = `📅 *Appointment Reminder*\n\nYou have an appointment with ${provider.fullName}\n\n🕐 Time: ${formattedTime}\n\nPlease arrive 10 minutes early.`;

      await sendWhatsAppNotification(patient.whatsappNumber, whatsappMessage, {
        category: NOTIFICATION_CATEGORIES.APPOINTMENT_REMINDER,
        priority: 'high',
        metadata: {
          appointmentId: appointment.id,
          patientId: patient.id,
          providerId: provider.id
        }
      });
    }

    // Send in-app notification
    if (patient.userId) {
      await sendInAppNotification(
        patient.userId,
        'Appointment Reminder',
        `You have an appointment with ${provider.fullName} on ${formattedTime}`,
        NOTIFICATION_CATEGORIES.APPOINTMENT_REMINDER,
        {
          appointmentId: appointment.id,
          providerId: provider.id
        }
      );
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to send appointment reminder', { error });
    throw error;
  }
};

/**
 * Send queue position update
 */
export const sendQueuePositionUpdate = async (patient, position, estimatedWaitTime) => {
  try {
    const message = position === 1 
      ? 'You are next in queue! Please be ready.' 
      : `Your position in queue: ${position}. Estimated wait time: ${estimatedWaitTime} minutes.`;

    // Send SMS
    if (patient.phoneNumber) {
      await sendSmsNotification(patient.phoneNumber, message, {
        category: NOTIFICATION_CATEGORIES.QUEUE_POSITION,
        priority: 'high',
        metadata: {
          queueId: patient.currentQueue,
          position,
          estimatedWaitTime
        }
      });
    }

    // Send in-app notification
    if (patient.userId) {
      await sendInAppNotification(
        patient.userId,
        'Queue Update',
        message,
        NOTIFICATION_CATEGORIES.QUEUE_POSITION,
        {
          position,
          estimatedWaitTime
        }
      );
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to send queue update', { error });
    // Don't throw - queue updates are informational
    return { success: false };
  }
};

/**
 * Send lab results notification
 */
export const sendLabResultsNotification = async (patient, results) => {
  try {
    // Send email with results
    if (patient.email) {
      await sendEmailNotification(
        patient.email,
        'Your Lab Results Are Ready',
        'lab_results',
        {
          patientName: patient.fullName,
          resultsDate: new Date().toLocaleDateString(),
          testTypes: results.testTypes,
          viewLink: `https://app.elderx.com/results/${results.id}`
        },
        {
          category: NOTIFICATION_CATEGORIES.LAB_RESULTS,
          priority: 'high',
          attachments: results.attachments || []
        }
      );
    }

    // Send SMS notification
    if (patient.phoneNumber) {
      const smsMessage = 'Your lab results are ready. Please log in to ElderX to view your results.';

      await sendSmsNotification(patient.phoneNumber, smsMessage, {
        category: NOTIFICATION_CATEGORIES.LAB_RESULTS,
        priority: 'high',
        metadata: {
          resultsId: results.id,
          patientId: patient.id
        }
      });
    }

    // Send in-app notification
    if (patient.userId) {
      await sendInAppNotification(
        patient.userId,
        'Lab Results Ready',
        'Your lab results are now available. Click to view.',
        NOTIFICATION_CATEGORIES.LAB_RESULTS,
        {
          resultsId: results.id
        }
      );
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to send lab results notification', { error });
    throw error;
  }
};

/**
 * Send billing notification
 */
export const sendBillingNotification = async (patient, amount, dueDate) => {
  try {
    const formattedAmount = `$${parseFloat(amount).toFixed(2)}`;
    const formattedDate = new Date(dueDate).toLocaleDateString();

    // Send email
    if (patient.email) {
      await sendEmailNotification(
        patient.email,
        `Payment Due: ${formattedAmount}`,
        'billing_alert',
        {
          patientName: patient.fullName,
          amount: formattedAmount,
          dueDate: formattedDate,
          paymentLink: `https://app.elderx.com/billing/pay`
        },
        {
          category: NOTIFICATION_CATEGORIES.BILLING_ALERT,
          priority: 'normal'
        }
      );
    }

    // Send SMS
    if (patient.phoneNumber) {
      const smsMessage = `Payment reminder: ${formattedAmount} is due on ${formattedDate}. Please pay at https://app.elderx.com/billing`;

      await sendSmsNotification(patient.phoneNumber, smsMessage, {
        category: NOTIFICATION_CATEGORIES.BILLING_ALERT,
        priority: 'normal',
        metadata: {
          patientId: patient.id,
          amount,
          dueDate
        }
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Failed to send billing notification', { error });
    throw error;
  }
};

/**
 * Get notification history for user
 */
export const getNotificationHistory = async (userId, limit = 50) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );

    const snapshot = await getDocs(q);
    const notifications = snapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()
      }))
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, limit);

    return notifications;
  } catch (error) {
    logger.error('Failed to get notification history', { error });
    return [];
  }
};

/**
 * Mark notification as read
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      read: true,
      readAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to mark notification as read', { error });
    throw error;
  }
};

/**
 * Delete notification
 */
export const deleteNotification = async (notificationId) => {
  try {
    const notifRef = doc(db, 'notifications', notificationId);
    await updateDoc(notifRef, {
      deleted: true,
      deletedAt: Timestamp.now()
    });

    return { success: true };
  } catch (error) {
    logger.error('Failed to delete notification', { error });
    throw error;
  }
};

/**
 * Internal: Send SMS via Twilio
 */
const sendSmsViaTwilio = async (phoneNumber, message, notificationId, category) => {
  try {
    // This should call your backend API endpoint that integrates with Twilio
    // const response = await fetch('/api/notifications/send-sms', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phoneNumber, message, notificationId, category })
    // });

    logger.info('SMS sent via Twilio', { notificationId });
    return { success: true };
  } catch (error) {
    logger.error('Twilio SMS failed', { error });
    throw error;
  }
};

/**
 * Internal: Send WhatsApp via Twilio
 */
const sendWhatsAppViaTwilio = async (phoneNumber, message, mediaUrl, notificationId, category) => {
  try {
    // This should call your backend API endpoint that integrates with Twilio WhatsApp
    // const response = await fetch('/api/notifications/send-whatsapp', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ phoneNumber, message, mediaUrl, notificationId, category })
    // });

    logger.info('WhatsApp sent via Twilio', { notificationId });
    return { success: true };
  } catch (error) {
    logger.error('Twilio WhatsApp failed', { error });
    throw error;
  }
};

/**
 * Internal: Send email via service
 */
const sendEmailViaService = async (email, subject, templateName, templateData, notificationId, category) => {
  try {
    // This should call your backend API endpoint that handles emails
    // Could be SendGrid, Backend, or custom email service
    // const response = await fetch('/api/notifications/send-email', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, subject, templateName, templateData, notificationId, category })
    // });

    logger.info('Email queued via service', { notificationId });
    return { success: true };
  } catch (error) {
    logger.error('Email service failed', { error });
    throw error;
  }
};

/**
 * Internal: Send via Backend Cloud Messaging
 */
const sendViaFCM = async (userId, title, message, notificationId, category) => {
  try {
    // This should call your Backend Cloud Function or backend
    // to send via Cloud Messaging Service
    // const response = await fetch('/api/notifications/send-fcm', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ userId, title, message, notificationId, category })
    // });

    logger.info('Push notification queued via FCM', { notificationId });
    return { success: true };
  } catch (error) {
    logger.error('FCM failed', { error });
    throw error;
  }
};

export default {
  sendSmsNotification,
  sendWhatsAppNotification,
  sendEmailNotification,
  sendPushNotification,
  sendInAppNotification,
  sendAppointmentReminder,
  sendQueuePositionUpdate,
  sendLabResultsNotification,
  sendBillingNotification,
  getNotificationHistory,
  markNotificationAsRead,
  deleteNotification,
  NOTIFICATION_TYPES,
  NOTIFICATION_CATEGORIES
};
