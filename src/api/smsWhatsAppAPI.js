/**
 * SMS/WhatsApp Integration API
 * 
 * Features:
 * - SMS notifications via Twilio or other providers
 * - WhatsApp notifications via WhatsApp Business API
 * - Queue notifications
 * - Appointment reminders
 * - Lab results notifications
 * - Billing notifications
 * - Follow-up reminders
 * - Broadcast announcements
 */

import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const SMS_WHATSAPP_LOGS_COLLECTION = 'smsWhatsAppLogs';
const SMS_WHATSAPP_SETTINGS_COLLECTION = 'smsWhatsAppSettings';

// Message types
export const MESSAGE_TYPES = {
  QUEUE_NOTIFICATION: 'queue_notification',
  APPOINTMENT_REMINDER: 'appointment_reminder',
  LAB_RESULT: 'lab_result',
  BILLING_NOTIFICATION: 'billing_notification',
  FOLLOW_UP_REMINDER: 'follow_up_reminder',
  BROADCAST: 'broadcast',
  EMERGENCY: 'emergency'
};

// Message channels
export const MESSAGE_CHANNELS = {
  SMS: 'sms',
  WHATSAPP: 'whatsapp',
  BOTH: 'both'
};

/**
 * Send SMS message
 * This is a placeholder that would integrate with actual SMS provider (Twilio, etc.)
 */
const sendSMS = async (phoneNumber, message, options = {}) => {
  try {
    // Format phone number (ensure it starts with country code)
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    // In production, this would call your SMS provider API
    // Example with Twilio:
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formattedPhone
    });
    
    return {
      success: true,
      messageId: result.sid,
      status: result.status,
      provider: 'twilio'
    };
    */

    // For now, log the SMS (would be sent in production)
    console.log(`[SMS] To: ${formattedPhone}, Message: ${message}`);
    
    // Log to database
    await logMessage({
      phoneNumber: formattedPhone,
      message,
      channel: MESSAGE_CHANNELS.SMS,
      type: options.type || MESSAGE_TYPES.BROADCAST,
      status: 'sent', // In production, would be actual status from provider
      provider: 'twilio', // or your SMS provider
      metadata: options.metadata || {}
    });

    return {
      success: true,
      messageId: `sms_${Date.now()}`,
      status: 'sent',
      provider: 'twilio'
    };
  } catch (error) {
    console.error('Error sending SMS:', error);
    
    // Log failed message
    await logMessage({
      phoneNumber: formatPhoneNumber(phoneNumber),
      message,
      channel: MESSAGE_CHANNELS.SMS,
      type: options.type || MESSAGE_TYPES.BROADCAST,
      status: 'failed',
      error: error.message,
      metadata: options.metadata || {}
    });

    throw error;
  }
};

/**
 * Send WhatsApp message
 * This is a placeholder that would integrate with WhatsApp Business API
 */
const sendWhatsApp = async (phoneNumber, message, options = {}) => {
  try {
    const formattedPhone = formatPhoneNumber(phoneNumber);
    
    if (!formattedPhone) {
      throw new Error('Invalid phone number format');
    }

    // In production, this would call WhatsApp Business API
    // Example with Twilio WhatsApp:
    /*
    const twilio = require('twilio');
    const client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${formattedPhone}`
    });
    
    return {
      success: true,
      messageId: result.sid,
      status: result.status,
      provider: 'twilio_whatsapp'
    };
    */

    // For now, log the WhatsApp message
    console.log(`[WhatsApp] To: ${formattedPhone}, Message: ${message}`);
    
    // Log to database
    await logMessage({
      phoneNumber: formattedPhone,
      message,
      channel: MESSAGE_CHANNELS.WHATSAPP,
      type: options.type || MESSAGE_TYPES.BROADCAST,
      status: 'sent',
      provider: 'whatsapp_business', // or your WhatsApp provider
      metadata: options.metadata || {}
    });

    return {
      success: true,
      messageId: `whatsapp_${Date.now()}`,
      status: 'sent',
      provider: 'whatsapp_business'
    };
  } catch (error) {
    console.error('Error sending WhatsApp:', error);
    
    await logMessage({
      phoneNumber: formatPhoneNumber(phoneNumber),
      message,
      channel: MESSAGE_CHANNELS.WHATSAPP,
      type: options.type || MESSAGE_TYPES.BROADCAST,
      status: 'failed',
      error: error.message,
      metadata: options.metadata || {}
    });

    throw error;
  }
};

/**
 * Send message via SMS, WhatsApp, or both
 */
export const sendMessage = async (phoneNumber, message, channel = MESSAGE_CHANNELS.SMS, options = {}) => {
  try {
    const results = [];

    if (channel === MESSAGE_CHANNELS.SMS || channel === MESSAGE_CHANNELS.BOTH) {
      const smsResult = await sendSMS(phoneNumber, message, options);
      results.push({ channel: MESSAGE_CHANNELS.SMS, ...smsResult });
    }

    if (channel === MESSAGE_CHANNELS.WHATSAPP || channel === MESSAGE_CHANNELS.BOTH) {
      const whatsappResult = await sendWhatsApp(phoneNumber, message, options);
      results.push({ channel: MESSAGE_CHANNELS.WHATSAPP, ...whatsappResult });
    }

    return {
      success: true,
      results
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/**
 * Send queue notification
 */
export const sendQueueNotification = async (patientPhone, queueData, channel = MESSAGE_CHANNELS.SMS) => {
  try {
    const { queueNumber, department, estimatedWaitTime, type } = queueData;
    
    let message = '';
    
    switch (type) {
      case 'queue_added':
        message = `Hello! You are number ${queueNumber} in the ${department} queue.`;
        if (estimatedWaitTime) {
          message += ` Estimated wait time: ${estimatedWaitTime} minutes.`;
        }
        message += ` Thank you for your patience.`;
        break;
      case 'queue_called':
        message = `Your turn! Queue number ${queueNumber}. Please proceed to ${department}. Doctor is ready to see you.`;
        break;
      case 'queue_position':
        message = `Queue update: You are number ${queueNumber} in the ${department} queue.`;
        break;
      default:
        message = `Queue update: Your queue number ${queueNumber} status has been updated.`;
    }

    return await sendMessage(patientPhone, message, channel, {
      type: MESSAGE_TYPES.QUEUE_NOTIFICATION,
      metadata: queueData
    });
  } catch (error) {
    console.error('Error sending queue notification:', error);
    throw error;
  }
};

/**
 * Send appointment reminder
 */
export const sendAppointmentReminder = async (patientPhone, appointmentData, channel = MESSAGE_CHANNELS.SMS) => {
  try {
    const { appointmentDate, appointmentTime, doctorName, type, notes } = appointmentData;
    const date = new Date(appointmentDate).toLocaleDateString();
    const time = appointmentTime || '';

    let message = `Appointment Reminder: You have an appointment on ${date}`;
    if (time) {
      message += ` at ${time}`;
    }
    if (doctorName) {
      message += ` with Dr. ${doctorName}`;
    }
    if (type) {
      message += ` (${type})`;
    }
    if (notes) {
      message += `. ${notes}`;
    }
    message += `. Please arrive 15 minutes early.`;

    return await sendMessage(patientPhone, message, channel, {
      type: MESSAGE_TYPES.APPOINTMENT_REMINDER,
      metadata: appointmentData
    });
  } catch (error) {
    console.error('Error sending appointment reminder:', error);
    throw error;
  }
};

/**
 * Send lab result notification
 */
export const sendLabResultNotification = async (patientPhone, labData, channel = MESSAGE_CHANNELS.SMS) => {
  try {
    const { testName, status, critical } = labData;
    
    let message = `Lab Results Available: Your ${testName} results are ready.`;
    
    if (critical) {
      message = `URGENT: Your ${testName} results require immediate attention. Please contact your doctor.`;
    } else if (status === 'abnormal') {
      message = `Lab Results: Your ${testName} results show some abnormalities. Please schedule a follow-up.`;
    }
    
    message += ` Please visit the hospital or check your Client portal.`;

    return await sendMessage(patientPhone, message, channel, {
      type: MESSAGE_TYPES.LAB_RESULT,
      metadata: labData
    });
  } catch (error) {
    console.error('Error sending lab result notification:', error);
    throw error;
  }
};

/**
 * Send billing notification
 */
export const sendBillingNotification = async (patientPhone, billingData, channel = MESSAGE_CHANNELS.SMS) => {
  try {
    const { billNumber, amount, dueDate, status } = billingData;
    const currency = billingData.currency || 'NGN';
    
    let message = `Billing Notification: Bill #${billNumber} for ${currency} ${amount.toLocaleString()}`;
    
    if (status === 'pending') {
      message += ` is pending payment.`;
      if (dueDate) {
        const due = new Date(dueDate).toLocaleDateString();
        message += ` Due date: ${due}.`;
      }
    } else if (status === 'paid') {
      message += ` has been paid. Thank you!`;
    } else if (status === 'overdue') {
      message += ` is overdue. Please make payment as soon as possible.`;
    }
    
    message += ` Thank you for choosing our services.`;

    return await sendMessage(patientPhone, message, channel, {
      type: MESSAGE_TYPES.BILLING_NOTIFICATION,
      metadata: billingData
    });
  } catch (error) {
    console.error('Error sending billing notification:', error);
    throw error;
  }
};

/**
 * Send follow-up reminder
 */
export const sendFollowUpReminder = async (patientPhone, followUpData, channel = MESSAGE_CHANNELS.SMS) => {
  try {
    const { followUpDate, followUpTime, doctorName, reason } = followUpData;
    const date = new Date(followUpDate).toLocaleDateString();
    const time = followUpTime || '';

    let message = `Follow-up Reminder: You have a follow-up appointment on ${date}`;
    if (time) {
      message += ` at ${time}`;
    }
    if (doctorName) {
      message += ` with Dr. ${doctorName}`;
    }
    if (reason) {
      message += ` for ${reason}`;
    }
    message += `. Please confirm your attendance.`;

    return await sendMessage(patientPhone, message, channel, {
      type: MESSAGE_TYPES.FOLLOW_UP_REMINDER,
      metadata: followUpData
    });
  } catch (error) {
    console.error('Error sending follow-up reminder:', error);
    throw error;
  }
};

/**
 * Send broadcast message to multiple recipients
 */
export const sendBroadcast = async (phoneNumbers, message, channel = MESSAGE_CHANNELS.SMS, options = {}) => {
  try {
    const results = [];
    
    for (const phoneNumber of phoneNumbers) {
      try {
        const result = await sendMessage(phoneNumber, message, channel, {
          type: MESSAGE_TYPES.BROADCAST,
          metadata: options.metadata || {}
        });
        results.push({ phoneNumber, success: true, ...result });
      } catch (error) {
        results.push({ phoneNumber, success: false, error: error.message });
      }
    }

    return {
      success: true,
      total: phoneNumbers.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results
    };
  } catch (error) {
    console.error('Error sending broadcast:', error);
    throw error;
  }
};

/**
 * Log message to database
 */
const logMessage = async (messageData) => {
  try {
    const logEntry = {
      ...messageData,
      createdAt: serverTimestamp(),
      timestamp: new Date().toISOString()
    };

    await addDoc(collection(db, SMS_WHATSAPP_LOGS_COLLECTION), logEntry);
    return true;
  } catch (error) {
    console.error('Error logging message:', error);
    // Don't throw - logging failure shouldn't break message sending
    return false;
  }
};

/**
 * Get message logs
 */
export const getMessageLogs = async (institutionId, options = {}) => {
  try {
    const { limitCount = 100, startDate, endDate, type, status } = options;
    
    let q = query(
      collection(db, SMS_WHATSAPP_LOGS_COLLECTION),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );

    // Add filters if provided
    if (institutionId) {
      q = query(q, where('institutionId', '==', institutionId));
    }
    if (type) {
      q = query(q, where('type', '==', type));
    }
    if (status) {
      q = query(q, where('status', '==', status));
    }

    const querySnapshot = await getDocs(q);
    const logs = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        timestamp: data.timestamp || data.createdAt
      });
    });

    // Filter by date range if provided
    let filtered = logs;
    if (startDate || endDate) {
      filtered = logs.filter(log => {
        const logDate = new Date(log.timestamp || log.createdAt);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    }

    return filtered;
  } catch (error) {
    console.error('Error fetching message logs:', error);
    throw error;
  }
};

/**
 * Get SMS/WhatsApp statistics
 */
export const getMessageStats = async (institutionId, dateRange = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);

    const logs = await getMessageLogs(institutionId, {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    const stats = {
      total: logs.length,
      byChannel: {
        [MESSAGE_CHANNELS.SMS]: 0,
        [MESSAGE_CHANNELS.WHATSAPP]: 0
      },
      byType: {},
      byStatus: {
        sent: 0,
        failed: 0,
        pending: 0
      },
      successRate: 0
    };

    logs.forEach(log => {
      // Count by channel
      if (log.channel) {
        stats.byChannel[log.channel] = (stats.byChannel[log.channel] || 0) + 1;
      }

      // Count by type
      if (log.type) {
        stats.byType[log.type] = (stats.byType[log.type] || 0) + 1;
      }

      // Count by status
      if (log.status) {
        stats.byStatus[log.status] = (stats.byStatus[log.status] || 0) + 1;
      }
    });

    // Calculate success rate
    const total = stats.byStatus.sent + stats.byStatus.failed;
    stats.successRate = total > 0 ? ((stats.byStatus.sent / total) * 100).toFixed(2) : 0;

    return stats;
  } catch (error) {
    console.error('Error getting message stats:', error);
    throw error;
  }
};

/**
 * Format phone number to international format
 */
const formatPhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  
  // Remove all non-digit characters
  let cleaned = phoneNumber.replace(/\D/g, '');
  
  // If it doesn't start with country code, assume it's a local number
  // Default to Nigeria (+234) if no country code
  if (!cleaned.startsWith('234') && cleaned.length === 10) {
    cleaned = '234' + cleaned;
  }
  
  // Add + prefix
  return '+' + cleaned;
};

/**
 * Get SMS/WhatsApp settings for institution
 */
export const getSettings = async (institutionId) => {
  try {
    const settingsRef = collection(db, SMS_WHATSAPP_SETTINGS_COLLECTION);
    const q = query(
      settingsRef,
      where('institutionId', '==', institutionId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      // Return default settings
      return {
        institutionId,
        enabled: false,
        defaultChannel: MESSAGE_CHANNELS.SMS,
        queueNotifications: { enabled: false, channel: MESSAGE_CHANNELS.SMS },
        appointmentReminders: { enabled: false, channel: MESSAGE_CHANNELS.SMS, advanceHours: 24 },
        labResults: { enabled: false, channel: MESSAGE_CHANNELS.SMS },
        billingNotifications: { enabled: false, channel: MESSAGE_CHANNELS.SMS },
        followUpReminders: { enabled: false, channel: MESSAGE_CHANNELS.SMS, advanceHours: 24 },
        provider: {
          sms: { provider: 'twilio', apiKey: '', apiSecret: '', phoneNumber: '' },
          whatsapp: { provider: 'whatsapp_business', apiKey: '', apiSecret: '', phoneNumber: '' }
        }
      };
    }

    const data = querySnapshot.docs[0].data();
    return {
      id: querySnapshot.docs[0].id,
      ...data
    };
  } catch (error) {
    console.error('Error fetching settings:', error);
    throw error;
  }
};

/**
 * Update SMS/WhatsApp settings
 */
export const updateSettings = async (institutionId, settings) => {
  try {
    const settingsRef = collection(db, SMS_WHATSAPP_SETTINGS_COLLECTION);
    const q = query(
      settingsRef,
      where('institutionId', '==', institutionId),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      // Create new settings
      await addDoc(settingsRef, {
        institutionId,
        ...settings,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } else {
      // Update existing settings
      const docRef = doc(db, SMS_WHATSAPP_SETTINGS_COLLECTION, querySnapshot.docs[0].id);
      await updateDoc(docRef, {
        ...settings,
        updatedAt: serverTimestamp()
      });
    }

    return true;
  } catch (error) {
    console.error('Error updating settings:', error);
    throw error;
  }
};

export default {
  sendMessage,
  sendQueueNotification,
  sendAppointmentReminder,
  sendLabResultNotification,
  sendBillingNotification,
  sendFollowUpReminder,
  sendBroadcast,
  getMessageLogs,
  getMessageStats,
  getSettings,
  updateSettings,
  MESSAGE_TYPES,
  MESSAGE_CHANNELS
};

