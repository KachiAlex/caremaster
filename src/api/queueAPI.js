/**
 * Queue Management API
 * 
 * Handles patient queue management for hospital departments:
 * - Queue number assignment
 * - Real-time queue tracking
 * - Departmental queues (GP, specialist, lab, pharmacy, billing)
 * - Priority queues (elderly, emergencies)
 * - Queue status updates
 * - SMS/WhatsApp notifications
 */

import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  setDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { notificationsAPI } from './notificationsAPI';

const QUEUE_COLLECTION = 'queues';
const QUEUE_COUNTERS_COLLECTION = 'queueCounters';

// Queue statuses
export const QUEUE_STATUS = {
  WAITING: 'waiting',
  CALLED: 'called',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  CANCELLED: 'cancelled'
};

// Queue priorities
export const QUEUE_PRIORITY = {
  NORMAL: 'normal',
  PRIORITY: 'priority', // Elderly, VIP
  EMERGENCY: 'emergency',
  URGENT: 'urgent' // High-risk vitals
};

// Department types
export const DEPARTMENT_TYPES = {
  GP: 'gp',
  SPECIALIST: 'specialist',
  LAB: 'lab',
  PHARMACY: 'pharmacy',
  BILLING: 'billing',
  RADIOLOGY: 'radiology',
  TRIAGE: 'triage'
};

/**
 * Get next queue number for a department
 */
const getNextQueueNumber = async (institutionId, department, date) => {
  try {
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
    const counterId = `${institutionId}_${department}_${dateStr}`;
    const counterRef = doc(db, QUEUE_COUNTERS_COLLECTION, counterId);
    const counterSnap = await getDoc(counterRef);

    if (counterSnap.exists()) {
      const currentCount = counterSnap.data().count || 0;
      await updateDoc(counterRef, {
        count: currentCount + 1,
        lastUpdated: serverTimestamp()
      });
      return currentCount + 1;
    } else {
      // Create new counter
      await setDoc(counterRef, {
        id: counterId,
        institutionId,
        department,
        date: dateStr,
        count: 1,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
      return 1;
    }
  } catch (error) {
    console.error('Error getting next queue number:', error);
    // Fallback: use timestamp-based number
    return Date.now() % 10000;
  }
};

/**
 * Add patient to queue
 */
export const addToQueue = async (queueData) => {
  try {
    const {
      patientId,
      patientName,
      institutionId,
      department,
      priority = QUEUE_PRIORITY.NORMAL,
      appointmentId = null,
      doctorId = null,
      doctorName = null,
      notes = '',
      estimatedWaitTime = null
    } = queueData;

    if (!patientId || !institutionId || !department) {
      throw new Error('Missing required fields: patientId, institutionId, department');
    }

    // Get next queue number
    const today = new Date();
    const queueNumber = await getNextQueueNumber(institutionId, department, today);

    // Create queue entry
    const queueEntry = {
      patientId,
      patientName,
      institutionId,
      department,
      queueNumber,
      priority,
      status: QUEUE_STATUS.WAITING,
      appointmentId,
      doctorId,
      doctorName,
      notes,
      estimatedWaitTime,
      addedAt: serverTimestamp(),
      calledAt: null,
      startedAt: null,
      completedAt: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const queueRef = collection(db, QUEUE_COLLECTION);
    const docRef = await addDoc(queueRef, queueEntry);

    // Send notification to patient
    try {
      await sendQueueNotification(patientId, {
        type: 'queue_added',
        queueNumber,
        department,
        estimatedWaitTime
      });
    } catch (notifError) {
      console.warn('Failed to send queue notification:', notifError);
    }

    return {
      id: docRef.id,
      ...queueEntry,
      queueNumber
    };
  } catch (error) {
    console.error('Error adding to queue:', error);
    throw error;
  }
};

/**
 * Get current queue for a department
 */
export const getQueueByDepartment = async (institutionId, department, options = {}) => {
  try {
    const { status, limitCount = 100 } = options;
    const queueRef = collection(db, QUEUE_COLLECTION);
    
    let q = query(
      queueRef,
      where('institutionId', '==', institutionId),
      where('department', '==', department),
      orderBy('priority', 'desc'), // Emergency first
      orderBy('queueNumber', 'asc') // Then by queue number
    );

    if (status) {
      q = query(q, where('status', '==', status));
    }

    if (limitCount) {
      q = query(q, limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    const queues = [];

    querySnapshot.forEach((doc) => {
      const queueData = doc.data();
      queues.push({
        id: doc.id,
        ...queueData,
        addedAt: queueData.addedAt?.toDate?.() || queueData.addedAt,
        calledAt: queueData.calledAt?.toDate?.() || queueData.calledAt,
        startedAt: queueData.startedAt?.toDate?.() || queueData.startedAt,
        completedAt: queueData.completedAt?.toDate?.() || queueData.completedAt,
        createdAt: queueData.createdAt?.toDate?.() || queueData.createdAt,
        updatedAt: queueData.updatedAt?.toDate?.() || queueData.updatedAt
      });
    });

    return queues;
  } catch (error) {
    console.error('Error fetching queue:', error);
    throw error;
  }
};

/**
 * Get queue position for a patient
 */
export const getPatientQueuePosition = async (patientId, institutionId, department) => {
  try {
    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(
      queueRef,
      where('patientId', '==', patientId),
      where('institutionId', '==', institutionId),
      where('department', '==', department),
      where('status', 'in', [QUEUE_STATUS.WAITING, QUEUE_STATUS.CALLED]),
      orderBy('queueNumber', 'asc'),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) {
      return null;
    }

    const queueData = querySnapshot.docs[0].data();
    
    // Get position in queue
    const allWaiting = await getQueueByDepartment(institutionId, department, {
      status: QUEUE_STATUS.WAITING
    });
    
    const position = allWaiting.findIndex(q => q.queueNumber < queueData.queueNumber) + 1;

    return {
      id: querySnapshot.docs[0].id,
      ...queueData,
      position,
      addedAt: queueData.addedAt?.toDate?.() || queueData.addedAt
    };
  } catch (error) {
    console.error('Error getting patient queue position:', error);
    throw error;
  }
};

/**
 * Call next patient in queue
 */
export const callNextPatient = async (institutionId, department, doctorId = null) => {
  try {
    // Get next patient in queue (waiting status, priority first)
    const waitingQueue = await getQueueByDepartment(institutionId, department, {
      status: QUEUE_STATUS.WAITING,
      limitCount: 1
    });

    if (waitingQueue.length === 0) {
      return { success: false, message: 'No patients in queue' };
    }

    const nextPatient = waitingQueue[0];
    const queueRef = doc(db, QUEUE_COLLECTION, nextPatient.id);

    await updateDoc(queueRef, {
      status: QUEUE_STATUS.CALLED,
      calledAt: serverTimestamp(),
      doctorId: doctorId || nextPatient.doctorId,
      updatedAt: serverTimestamp()
    });

    // Send notification
    try {
      await sendQueueNotification(nextPatient.patientId, {
        type: 'queue_called',
        queueNumber: nextPatient.queueNumber,
        department,
        message: 'Doctor is ready to see you'
      });
    } catch (notifError) {
      console.warn('Failed to send queue notification:', notifError);
    }

    return {
      success: true,
      queue: {
        ...nextPatient,
        status: QUEUE_STATUS.CALLED,
        calledAt: new Date()
      }
    };
  } catch (error) {
    console.error('Error calling next patient:', error);
    throw error;
  }
};

/**
 * Update queue status
 */
export const updateQueueStatus = async (queueId, status, additionalData = {}) => {
  try {
    const queueRef = doc(db, QUEUE_COLLECTION, queueId);
    const updateData = {
      status,
      updatedAt: serverTimestamp(),
      ...additionalData
    };

    // Add timestamp based on status
    if (status === QUEUE_STATUS.IN_PROGRESS && !additionalData.startedAt) {
      updateData.startedAt = serverTimestamp();
    } else if (status === QUEUE_STATUS.COMPLETED && !additionalData.completedAt) {
      updateData.completedAt = serverTimestamp();
    }

    await updateDoc(queueRef, updateData);

    // Get updated queue data
    const queueSnap = await getDoc(queueRef);
    if (queueSnap.exists()) {
      const queueData = queueSnap.data();
      
      // Send notification if completed
      if (status === QUEUE_STATUS.COMPLETED) {
        try {
          await sendQueueNotification(queueData.patientId, {
            type: 'queue_completed',
            queueNumber: queueData.queueNumber,
            department: queueData.department
          });
        } catch (notifError) {
          console.warn('Failed to send queue notification:', notifError);
        }
      }

      return {
        id: queueSnap.id,
        ...queueData,
        addedAt: queueData.addedAt?.toDate?.() || queueData.addedAt,
        calledAt: queueData.calledAt?.toDate?.() || queueData.calledAt,
        startedAt: queueData.startedAt?.toDate?.() || queueData.startedAt,
        completedAt: queueData.completedAt?.toDate?.() || queueData.completedAt
      };
    }

    return null;
  } catch (error) {
    console.error('Error updating queue status:', error);
    throw error;
  }
};

/**
 * Skip patient in queue
 */
export const skipPatient = async (queueId, reason = '') => {
  try {
    return await updateQueueStatus(queueId, QUEUE_STATUS.SKIPPED, {
      skipReason: reason
    });
  } catch (error) {
    console.error('Error skipping patient:', error);
    throw error;
  }
};

/**
 * Cancel queue entry
 */
export const cancelQueueEntry = async (queueId, reason = '') => {
  try {
    return await updateQueueStatus(queueId, QUEUE_STATUS.CANCELLED, {
      cancelReason: reason
    });
  } catch (error) {
    console.error('Error cancelling queue entry:', error);
    throw error;
  }
};

/**
 * Get queue statistics
 */
export const getQueueStats = async (institutionId, department, date = null) => {
  try {
    const targetDate = date || new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(
      queueRef,
      where('institutionId', '==', institutionId),
      where('department', '==', department)
    );

    const querySnapshot = await getDocs(q);
    const stats = {
      total: 0,
      waiting: 0,
      called: 0,
      inProgress: 0,
      completed: 0,
      skipped: 0,
      cancelled: 0,
      averageWaitTime: 0,
      averageServiceTime: 0
    };

    const waitTimes = [];
    const serviceTimes = [];

    querySnapshot.forEach((doc) => {
      const queueData = doc.data();
      const addedAt = queueData.addedAt?.toDate?.() || new Date(queueData.addedAt);
      
      // Only count today's entries
      if (addedAt >= startOfDay && addedAt <= endOfDay) {
        stats.total++;
        stats[queueData.status] = (stats[queueData.status] || 0) + 1;

        // Calculate wait time (addedAt to calledAt)
        if (queueData.calledAt) {
          const calledAt = queueData.calledAt?.toDate?.() || new Date(queueData.calledAt);
          const waitTime = (calledAt - addedAt) / 1000 / 60; // minutes
          waitTimes.push(waitTime);
        }

        // Calculate service time (calledAt to completedAt)
        if (queueData.completedAt && queueData.calledAt) {
          const calledAt = queueData.calledAt?.toDate?.() || new Date(queueData.calledAt);
          const completedAt = queueData.completedAt?.toDate?.() || new Date(queueData.completedAt);
          const serviceTime = (completedAt - calledAt) / 1000 / 60; // minutes
          serviceTimes.push(serviceTime);
        }
      }
    });

    if (waitTimes.length > 0) {
      stats.averageWaitTime = waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length;
    }

    if (serviceTimes.length > 0) {
      stats.averageServiceTime = serviceTimes.reduce((a, b) => a + b, 0) / serviceTimes.length;
    }

    return stats;
  } catch (error) {
    console.error('Error getting queue stats:', error);
    throw error;
  }
};

/**
 * Subscribe to real-time queue updates
 */
export const subscribeToQueue = (institutionId, department, callback, options = {}) => {
  const { status } = options;
  const queueRef = collection(db, QUEUE_COLLECTION);
  
  let q = query(
    queueRef,
    where('institutionId', '==', institutionId),
    where('department', '==', department),
    orderBy('priority', 'desc'),
    orderBy('queueNumber', 'asc')
  );

  if (status) {
    q = query(q, where('status', '==', status));
  }

  return onSnapshot(q, (querySnapshot) => {
    const queues = [];
    querySnapshot.forEach((doc) => {
      const queueData = doc.data();
      queues.push({
        id: doc.id,
        ...queueData,
        addedAt: queueData.addedAt?.toDate?.() || queueData.addedAt,
        calledAt: queueData.calledAt?.toDate?.() || queueData.calledAt,
        startedAt: queueData.startedAt?.toDate?.() || queueData.startedAt,
        completedAt: queueData.completedAt?.toDate?.() || queueData.completedAt
      });
    });
    callback(queues);
  });
};

/**
 * Send queue notification to patient
 */
const sendQueueNotification = async (patientId, notificationData) => {
  try {
    const { type, queueNumber, department, estimatedWaitTime, message } = notificationData;
    
    let notificationMessage = '';
    let title = 'Queue Update';

    switch (type) {
      case 'queue_added':
        title = 'Added to Queue';
        notificationMessage = `You are number ${queueNumber} in the ${department} queue.`;
        if (estimatedWaitTime) {
          notificationMessage += ` Estimated wait time: ${estimatedWaitTime} minutes.`;
        }
        break;
      case 'queue_called':
        title = 'Your Turn';
        notificationMessage = message || `You are number ${queueNumber}. Doctor is ready to see you.`;
        break;
      case 'queue_completed':
        title = 'Queue Completed';
        notificationMessage = `Your queue number ${queueNumber} has been completed.`;
        break;
      default:
        notificationMessage = `Queue update: ${message || 'Your queue status has changed'}`;
    }

    await notificationsAPI.createNotification({
      userId: patientId,
      type: 'appointment',
      title,
      message: notificationMessage,
      priority: type === 'queue_called' ? 'high' : 'medium',
      data: {
        queueNumber,
        department,
        type
      }
    });

    // TODO: Integrate with SMS/WhatsApp service
    // await sendSMS(patientPhone, notificationMessage);
    // await sendWhatsApp(patientPhone, notificationMessage);
  } catch (error) {
    console.error('Error sending queue notification:', error);
    throw error;
  }
};

/**
 * Get all queues for a patient
 */
export const getPatientQueues = async (patientId, institutionId) => {
  try {
    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(
      queueRef,
      where('patientId', '==', patientId),
      where('institutionId', '==', institutionId),
      orderBy('addedAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const queues = [];

    querySnapshot.forEach((doc) => {
      const queueData = doc.data();
      queues.push({
        id: doc.id,
        ...queueData,
        addedAt: queueData.addedAt?.toDate?.() || queueData.addedAt,
        calledAt: queueData.calledAt?.toDate?.() || queueData.calledAt,
        startedAt: queueData.startedAt?.toDate?.() || queueData.startedAt,
        completedAt: queueData.completedAt?.toDate?.() || queueData.completedAt
      });
    });

    return queues;
  } catch (error) {
    console.error('Error getting patient queues:', error);
    throw error;
  }
};

/**
 * Clear completed queues (cleanup old entries)
 */
export const clearCompletedQueues = async (institutionId, daysOld = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const queueRef = collection(db, QUEUE_COLLECTION);
    const q = query(
      queueRef,
      where('institutionId', '==', institutionId),
      where('status', '==', QUEUE_STATUS.COMPLETED)
    );

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);
    let count = 0;

    querySnapshot.forEach((doc) => {
      const queueData = doc.data();
      const completedAt = queueData.completedAt?.toDate?.() || new Date(queueData.completedAt);
      
      if (completedAt < cutoffDate) {
        batch.delete(doc.ref);
        count++;
      }
    });

    if (count > 0) {
      await batch.commit();
    }

    return { success: true, deletedCount: count };
  } catch (error) {
    console.error('Error clearing completed queues:', error);
    throw error;
  }
};

