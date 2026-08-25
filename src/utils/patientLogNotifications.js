/**
 * Client Log Notifications
 * Handles notifications based on Client log events
 */

import { notificationsAPI, NOTIFICATION_TYPES, NOTIFICATION_PRIORITIES } from '../api/notificationsAPI';
import { collection, query, getDocs, where } from 'backend/database';
import { db } from '../backend/config';

/**
 * Check if vital signs are abnormal and send notification
 * @param {Object} vitalSignData - Vital sign data
 * @param {string} clientId - Client simple ID
 * @param {string} clientName - Client name
 * @param {string} institutionId - Institution ID
 * @returns {Promise<boolean>} True if notification sent
 */
export const checkAbnormalVitalSigns = async (vitalSignData, patientSimpleId, clientName, institutionId) => {
  try {
    const alerts = [];
    
    // Check blood pressure
    if (vitalSignData.type === 'Blood Pressure' && vitalSignData.value) {
      const bp = vitalSignData.value.split('/');
      if (bp.length === 2) {
        const systolic = parseInt(bp[0]);
        const diastolic = parseInt(bp[1]);
        
        if (systolic > 140 || diastolic > 90) {
          alerts.push({
            type: 'HIGH_BLOOD_PRESSURE',
            message: `High blood pressure detected: ${vitalSignData.value} mmHg`,
            priority: NOTIFICATION_PRIORITIES.HIGH
          });
        } else if (systolic < 90 || diastolic < 60) {
          alerts.push({
            type: 'LOW_BLOOD_PRESSURE',
            message: `Low blood pressure detected: ${vitalSignData.value} mmHg`,
            priority: NOTIFICATION_PRIORITIES.HIGH
          });
        }
      }
    }
    
    // Check heart rate
    if (vitalSignData.type === 'Heart Rate' && vitalSignData.value) {
      const heartRate = parseInt(vitalSignData.value);
      if (heartRate > 100) {
        alerts.push({
          type: 'HIGH_HEART_RATE',
          message: `High heart rate detected: ${heartRate} bpm`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM
        });
      } else if (heartRate < 60) {
        alerts.push({
          type: 'LOW_HEART_RATE',
          message: `Low heart rate detected: ${heartRate} bpm`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM
        });
      }
    }
    
    // Check temperature
    if (vitalSignData.type === 'Temperature' && vitalSignData.value) {
      const temp = parseFloat(vitalSignData.value);
      if (temp > 100.4) {
        alerts.push({
          type: 'FEVER',
          message: `Fever detected: ${temp}°F`,
          priority: NOTIFICATION_PRIORITIES.HIGH
        });
      } else if (temp < 97.0) {
        alerts.push({
          type: 'HYPOTHERMIA',
          message: `Low temperature detected: ${temp}°F`,
          priority: NOTIFICATION_PRIORITIES.HIGH
        });
      }
    }
    
    // Send notifications for each alert
    if (alerts.length > 0) {
      // Get all doctors and admins for the institution
      const { collection, query, where, getDocs } = await import('backend/database');
      const { db } = await import('../backend/config');
      
      const usersRef = collection(db, 'users');
      const q = query(
        usersRef,
        where('institutionId', '==', institutionId),
        where('userType', 'in', ['doctor', 'admin'])
      );
      
      const snapshot = await getDocs(q);
      const notificationPromises = [];
      
      snapshot.forEach((doc) => {
        const userData = doc.data();
        alerts.forEach(alert => {
          notificationPromises.push(
            notificationsAPI.createNotification({
              userId: doc.id,
              userEmail: userData.email,
              userType: userData.userType,
              type: NOTIFICATION_TYPES.ALERT,
              title: `Abnormal Vital Signs - ${clientName}`,
              message: alert.message,
              priority: alert.priority,
              data: {
                clientId: patientSimpleId,
                clientName,
                vitalSignData,
                alertType: alert.type
              }
            })
          );
        });
      });
      
      await Promise.all(notificationPromises);
      console.log(`✅ Sent ${alerts.length} vital sign alert(s) for Client ${patientSimpleId}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking abnormal vital signs:', error);
    return false;
  }
};

/**
 * Send notification for critical log events
 * @param {Object} logData - Log data
 * @param {string} institutionId - Institution ID
 * @returns {Promise<boolean>} True if notification sent
 */
export const notifyCriticalEvent = async (logData, institutionId) => {
  try {
    // Define critical events
    const criticalEvents = [
      'patient_registered',
      'medication_administered',
      'consultation_conducted',
      'care_plan_updated'
    ];
    
    if (!criticalEvents.includes(logData.action)) {
      return false;
    }
    
    // Get admins for the institution
    const { collection, query, where, getDocs } = await import('backend/database');
    const { db } = await import('../backend/config');
    
    const usersRef = collection(db, 'users');
    const q = query(
      usersRef,
      where('institutionId', '==', institutionId),
      where('userType', '==', 'admin')
    );
    
    const snapshot = await getDocs(q);
    const notificationPromises = [];
    
    const titles = {
      'patient_registered': 'New Client Registered',
      'medication_administered': 'Medication Administered',
      'consultation_conducted': 'Consultation Conducted',
      'care_plan_updated': 'Care Plan Updated'
    };
    
    snapshot.forEach((doc) => {
      const userData = doc.data();
      notificationPromises.push(
        notificationsAPI.createNotification({
          userId: doc.id,
          userEmail: userData.email,
          userType: 'admin',
          type: NOTIFICATION_TYPES.SYSTEM,
          title: titles[logData.action] || 'Client Activity',
          message: `${logData.clinicianName} (${logData.clinicianRole}): ${logData.description}`,
          priority: NOTIFICATION_PRIORITIES.MEDIUM,
          data: {
            clientId: logData.clientId,
            logId: logData.id,
            action: logData.action,
            clinicianId: logData.clinicianId
          }
        })
      );
    });
    
    await Promise.all(notificationPromises);
    console.log(`✅ Sent critical event notification for ${logData.action}`);
    return true;
  } catch (error) {
    console.error('Error sending critical event notification:', error);
    return false;
  }
};

/**
 * Send daily summary notification
 * @param {string} userId - User ID
 * @param {string} userEmail - User email
 * @param {string} userType - User type
 * @param {Object} summaryData - Summary data
 * @returns {Promise<boolean>} True if notification sent
 */
export const sendDailySummary = async (userId, userEmail, userType, summaryData) => {
  try {
    const message = `Daily Summary - ${summaryData.totalActivities || 0} activities, ${summaryData.patientsSeen || 0} clients`;
    
    await notificationsAPI.createNotification({
      userId,
      userEmail,
      userType,
      type: NOTIFICATION_TYPES.SYSTEM,
      title: 'Daily Activity Summary',
      message,
      priority: NOTIFICATION_PRIORITIES.LOW,
      data: summaryData
    });
    
    return true;
  } catch (error) {
    console.error('Error sending daily summary:', error);
    return false;
  }
};

export default {
  checkAbnormalVitalSigns,
  notifyCriticalEvent,
  sendDailySummary
};

