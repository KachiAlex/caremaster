/**
 * Hospital Operations Notifications
 * Monitors and sends notifications for critical events
 */

import { toast } from 'react-toastify';
import { collection, query, where, onSnapshot } from 'backend/database';
import { db } from '../backend/config';

const NOTIFICATIONS_COLLECTION = 'notifications';
const HOSPITAL_BEDS_COLLECTION = 'hospitalBeds';
const HOSPITAL_INCIDENTS_COLLECTION = 'hospitalIncidents';
const HOSPITAL_SHIFTS_COLLECTION = 'hospitalShifts';

/**
 * Check for bed shortages and send notification
 * @param {string} hospitalId - Hospital/Institution ID
 * @param {number} threshold - Minimum available beds threshold (default: 5)
 * @param {Function} callback - Callback function when shortage detected
 */
export function monitorBedShortage(hospitalId, threshold = 5, callback) {
  if (!hospitalId) return () => {};

  const bedsRef = collection(db, HOSPITAL_BEDS_COLLECTION);
  const q = query(
    bedsRef,
    where('institutionId', '==', hospitalId),
    where('status', '==', 'available')
  );

  let lastNotificationTime = null;
  const NOTIFICATION_COOLDOWN = 30 * 60 * 1000; // 30 minutes

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const availableBeds = snapshot.size;
      
      if (availableBeds < threshold) {
        const now = Date.now();
        // Only notify if cooldown period has passed
        if (!lastNotificationTime || (now - lastNotificationTime) > NOTIFICATION_COOLDOWN) {
          lastNotificationTime = now;
          
          const message = `⚠️ Bed Shortage Alert: Only ${availableBeds} bed(s) available (threshold: ${threshold})`;
          
          if (callback) {
            callback({
              type: 'bed_shortage',
              severity: 'high',
              message,
              availableBeds,
              threshold,
              hospitalId,
            });
          } else {
            toast.warning(message, {
              autoClose: 10000,
              position: 'top-right',
            });
          }

          // Create notification in Database
          createNotification(hospitalId, {
            type: 'bed_shortage',
            severity: 'high',
            title: 'Bed Shortage Alert',
            message,
            data: { availableBeds, threshold },
          });
        }
      }
    },
    (error) => {
      console.error('Error monitoring bed shortage:', error);
    }
  );

  return unsubscribe;
}

/**
 * Monitor critical incidents and send notifications
 * @param {string} hospitalId - Hospital/Institution ID
 * @param {Function} callback - Callback function when critical incident detected
 */
export function monitorCriticalIncidents(hospitalId, callback) {
  if (!hospitalId) return () => {};

  const incidentsRef = collection(db, HOSPITAL_INCIDENTS_COLLECTION);
  const q = query(
    incidentsRef,
    where('institutionId', '==', hospitalId),
    where('severity', 'in', ['high', 'critical']),
    where('status', '==', 'open')
  );

  const processedIncidents = new Set();

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && !processedIncidents.has(change.doc.id)) {
          processedIncidents.add(change.doc.id);
          
          const incident = {
            id: change.doc.id,
            ...change.doc.data(),
          };

          const message = `🚨 Critical Incident: ${incident.type} - ${incident.description?.substring(0, 100)}...`;
          
          if (callback) {
            callback({
              type: 'critical_incident',
              severity: incident.severity,
              message,
              incident,
              hospitalId,
            });
          } else {
            toast.error(message, {
              autoClose: 15000,
              position: 'top-right',
            });
          }

          // Create notification in Database
          createNotification(hospitalId, {
            type: 'critical_incident',
            severity: incident.severity,
            title: `Critical Incident: ${incident.type}`,
            message: incident.description,
            data: { incidentId: incident.id, type: incident.type },
          });
        }
      });
    },
    (error) => {
      console.error('Error monitoring critical incidents:', error);
    }
  );

  return unsubscribe;
}

/**
 * Check for shift conflicts (overlapping shifts for same staff)
 * @param {string} hospitalId - Hospital/Institution ID
 * @param {Function} callback - Callback function when conflict detected
 */
export function monitorShiftConflicts(hospitalId, callback) {
  if (!hospitalId) return () => {};

  const shiftsRef = collection(db, HOSPITAL_SHIFTS_COLLECTION);
  const q = query(
    shiftsRef,
    where('institutionId', '==', hospitalId)
  );

  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const shifts = [];
      snapshot.forEach((doc) => {
        const shiftData = doc.data();
        shifts.push({
          id: doc.id,
          ...shiftData,
          startTime: shiftData.startTime?.toDate?.() || shiftData.startTime,
          endTime: shiftData.endTime?.toDate?.() || shiftData.endTime,
        });
      });

      // Check for conflicts
      const conflicts = findShiftConflicts(shifts);
      
      if (conflicts.length > 0) {
        conflicts.forEach((conflict) => {
          const message = `⚠️ Shift Conflict: ${conflict.staffName} has overlapping shifts on ${conflict.date}`;
          
          if (callback) {
            callback({
              type: 'shift_conflict',
              severity: 'medium',
              message,
              conflict,
              hospitalId,
            });
          } else {
            toast.warning(message, {
              autoClose: 10000,
              position: 'top-right',
            });
          }

          // Create notification in Database
          createNotification(hospitalId, {
            type: 'shift_conflict',
            severity: 'medium',
            title: 'Shift Conflict Detected',
            message,
            data: { conflict, staffId: conflict.staffId },
          });
        });
      }
    },
    (error) => {
      console.error('Error monitoring shift conflicts:', error);
    }
  );

  return unsubscribe;
}

/**
 * Find overlapping shifts for the same staff member
 * @param {Array} shifts - Array of shift objects
 * @returns {Array} Array of conflict objects
 */
function findShiftConflicts(shifts) {
  const conflicts = [];
  const staffShifts = {};

  // Group shifts by staff ID
  shifts.forEach((shift) => {
    if (!shift.staffId) return;
    if (!staffShifts[shift.staffId]) {
      staffShifts[shift.staffId] = [];
    }
    staffShifts[shift.staffId].push(shift);
  });

  // Check for overlaps within each staff member's shifts
  Object.keys(staffShifts).forEach((staffId) => {
    const staffShiftList = staffShifts[staffId];
    
    for (let i = 0; i < staffShiftList.length; i++) {
      for (let j = i + 1; j < staffShiftList.length; j++) {
        const shift1 = staffShiftList[i];
        const shift2 = staffShiftList[j];
        
        if (shiftsOverlap(shift1, shift2)) {
          conflicts.push({
            staffId,
            staffName: shift1.staffName || 'Unknown',
            shift1: { id: shift1.id, startTime: shift1.startTime, endTime: shift1.endTime },
            shift2: { id: shift2.id, startTime: shift2.startTime, endTime: shift2.endTime },
            date: shift1.startTime?.toLocaleDateString() || 'Unknown',
          });
        }
      }
    }
  });

  return conflicts;
}

/**
 * Check if two shifts overlap
 * @param {Object} shift1 - First shift
 * @param {Object} shift2 - Second shift
 * @returns {boolean} True if shifts overlap
 */
function shiftsOverlap(shift1, shift2) {
  const start1 = shift1.startTime instanceof Date ? shift1.startTime : new Date(shift1.startTime);
  const end1 = shift1.endTime instanceof Date ? shift1.endTime : new Date(shift1.endTime);
  const start2 = shift2.startTime instanceof Date ? shift2.startTime : new Date(shift2.startTime);
  const end2 = shift2.endTime instanceof Date ? shift2.endTime : new Date(shift2.endTime);

  return start1 < end2 && start2 < end1;
}

/**
 * Create a notification in Database
 * @param {string} hospitalId - Hospital/Institution ID
 * @param {Object} notificationData - Notification data
 */
async function createNotification(hospitalId, notificationData) {
  try {
    const notificationsRef = collection(db, NOTIFICATIONS_COLLECTION);
    await notificationsRef.add({
      ...notificationData,
      institutionId: hospitalId,
      userId: null, // System notification
      read: false,
      createdAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Start monitoring all hospital operations notifications
 * @param {string} hospitalId - Hospital/Institution ID
 * @param {Object} options - Monitoring options
 * @param {number} options.bedThreshold - Bed shortage threshold
 * @param {Function} options.onBedShortage - Callback for bed shortage
 * @param {Function} options.onCriticalIncident - Callback for critical incidents
 * @param {Function} options.onShiftConflict - Callback for shift conflicts
 * @returns {Function} Unsubscribe function
 */
export function startHospitalMonitoring(hospitalId, options = {}) {
  const {
    bedThreshold = 5,
    onBedShortage,
    onCriticalIncident,
    onShiftConflict,
  } = options;

  const unsubscribers = [];

  // Start monitoring bed shortages
  const bedUnsubscribe = monitorBedShortage(hospitalId, bedThreshold, onBedShortage);
  unsubscribers.push(bedUnsubscribe);

  // Start monitoring critical incidents
  const incidentUnsubscribe = monitorCriticalIncidents(hospitalId, onCriticalIncident);
  unsubscribers.push(incidentUnsubscribe);

  // Start monitoring shift conflicts
  const shiftUnsubscribe = monitorShiftConflicts(hospitalId, onShiftConflict);
  unsubscribers.push(shiftUnsubscribe);

  // Return combined unsubscribe function
  return () => {
    unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
  };
}

export default {
  monitorBedShortage,
  monitorCriticalIncidents,
  monitorShiftConflicts,
  startHospitalMonitoring,
};

