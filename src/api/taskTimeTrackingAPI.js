/**
 * Task Time Tracking API
 * 
 * Handles task-level clock in/out functionality for accurate work rate calculation
 * and billing integration.
 */

import { 
  collection, 
  doc, 
  getDoc,
  addDoc, 
  updateDoc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../firebase/config';

const TASK_TIME_TRACKING_COLLECTION = 'taskTimeTracking';
const CARE_TASKS_COLLECTION = 'careTasks';

/**
 * Start a task (clock in)
 * Records the start time and updates task status to 'in_progress'
 */
export const startTask = async (taskId, caregiverId) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const task = taskSnap.data();
    
    // Check if task is already started
    if (task.status === 'in_progress' && task.taskStartTime) {
      throw new Error('Task is already in progress');
    }
    
    // Check if task is already completed
    if (task.status === 'completed') {
      throw new Error('Cannot start a completed task');
    }
    
    // Get caregiver's hourly rate
    let hourlyRate = 0;
    try {
      const caregiversRef = collection(db, 'caregivers');
      const caregiverQuery = query(caregiversRef, where('userId', '==', caregiverId));
      const caregiverSnapshot = await getDocs(caregiverQuery);
      
      if (!caregiverSnapshot.empty) {
        hourlyRate = caregiverSnapshot.docs[0].data()?.hourlyRate || 0;
      }
    } catch (error) {
      console.warn('Could not fetch caregiver hourly rate:', error);
      // Continue with hourlyRate = 0, can be set later
    }
    
    // Update task with start time
    await updateDoc(taskRef, {
      status: 'in_progress',
      taskStartTime: serverTimestamp(),
      hourlyRate: hourlyRate,
      updatedAt: serverTimestamp()
    });
    
    // Create time tracking record
    const trackingRef = await addDoc(collection(db, TASK_TIME_TRACKING_COLLECTION), {
      taskId,
      caregiverId,
      clientId: task.clientId || task.patientId,
      taskType: 'careTask',
      action: 'start',
      timestamp: serverTimestamp(),
      hourlyRate: hourlyRate,
      institutionId: task.institutionId,
      createdAt: serverTimestamp()
    });
    
    return { 
      success: true, 
      trackingId: trackingRef.id,
      startTime: new Date(),
      hourlyRate: hourlyRate
    };
  } catch (error) {
    console.error('Error starting task:', error);
    throw error;
  }
};

/**
 * Complete a task (clock out)
 * Records the end time, calculates duration, and updates task status
 */
export const completeTask = async (taskId, caregiverId, completionNotes = '', photos = []) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const task = taskSnap.data();
    
    // Check if task was started
    if (!task.taskStartTime) {
      throw new Error('Task was not started. Please start the task first.');
    }
    
    // Check if task is already completed
    if (task.status === 'completed') {
      throw new Error('Task is already completed');
    }
    
    const startTime = task.taskStartTime.toDate();
    const endTime = new Date();
    const durationMs = endTime - startTime;
    const durationHours = durationMs / (1000 * 60 * 60); // Convert to hours
    
    // Ensure minimum duration of 0.25 hours (15 minutes) for billing
    const billableDuration = Math.max(durationHours, 0.25);
    
    const hourlyRate = task.hourlyRate || 0;
    const billableAmount = billableDuration * hourlyRate;
    
    // Update task with completion
    await updateDoc(taskRef, {
      status: 'completed',
      taskEndTime: serverTimestamp(),
      actualDuration: Math.round(durationHours * 100) / 100, // Round to 2 decimals
      billableDuration: Math.round(billableDuration * 100) / 100,
      billableAmount: Math.round(billableAmount * 100) / 100,
      completionNotes: completionNotes,
      photos: photos,
      completedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // Create time tracking record
    await addDoc(collection(db, TASK_TIME_TRACKING_COLLECTION), {
      taskId,
      caregiverId,
      clientId: task.clientId || task.patientId,
      taskType: 'careTask',
      action: 'complete',
      timestamp: serverTimestamp(),
      duration: billableDuration,
      actualDuration: durationHours,
      billableAmount: billableAmount,
      hourlyRate: hourlyRate,
      institutionId: task.institutionId,
      createdAt: serverTimestamp()
    });
    
    return {
      success: true,
      duration: Math.round(durationHours * 100) / 100,
      billableDuration: Math.round(billableDuration * 100) / 100,
      billableAmount: Math.round(billableAmount * 100) / 100,
      hourlyRate: hourlyRate
    };
  } catch (error) {
    console.error('Error completing task:', error);
    throw error;
  }
};

/**
 * Get work hours for a caregiver in a date range
 */
export const getWorkHours = async (caregiverId, startDate, endDate) => {
  try {
    const trackingQuery = query(
      collection(db, TASK_TIME_TRACKING_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('action', '==', 'complete'),
      where('timestamp', '>=', Timestamp.fromDate(startDate)),
      where('timestamp', '<=', Timestamp.fromDate(endDate)),
      orderBy('timestamp', 'asc')
    );
    
    const snapshot = await getDocs(trackingQuery);
    
    let totalHours = 0;
    let totalBillable = 0;
    const clientBreakdown = {};
    const taskBreakdown = [];
    
    snapshot.forEach(doc => {
      const data = doc.data();
      const duration = data.duration || 0;
      const billable = data.billableAmount || 0;
      
      totalHours += duration;
      totalBillable += billable;
      
      if (data.clientId) {
        if (!clientBreakdown[data.clientId]) {
          clientBreakdown[data.clientId] = {
            clientId: data.clientId,
            hours: 0,
            billableAmount: 0,
            taskCount: 0
          };
        }
        clientBreakdown[data.clientId].hours += duration;
        clientBreakdown[data.clientId].billableAmount += billable;
        clientBreakdown[data.clientId].taskCount += 1;
      }
      
      taskBreakdown.push({
        taskId: data.taskId,
        clientId: data.clientId,
        duration: duration,
        actualDuration: data.actualDuration || duration,
        billableAmount: billable,
        hourlyRate: data.hourlyRate || 0,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      });
    });
    
    // Round client breakdown values
    Object.keys(clientBreakdown).forEach(clientId => {
      clientBreakdown[clientId].hours = Math.round(clientBreakdown[clientId].hours * 100) / 100;
      clientBreakdown[clientId].billableAmount = Math.round(clientBreakdown[clientId].billableAmount * 100) / 100;
    });
    
    return {
      caregiverId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      totalHours: Math.round(totalHours * 100) / 100,
      totalBillable: Math.round(totalBillable * 100) / 100,
      clientBreakdown,
      taskBreakdown,
      taskCount: snapshot.size
    };
  } catch (error) {
    console.error('Error getting work hours:', error);
    throw error;
  }
};

/**
 * Get active tasks for a caregiver (tasks currently in progress)
 */
export const getActiveTasks = async (caregiverId) => {
  try {
    const tasksQuery = query(
      collection(db, CARE_TASKS_COLLECTION),
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'in_progress'),
      orderBy('taskStartTime', 'desc')
    );
    
    const snapshot = await getDocs(tasksQuery);
    
    const activeTasks = [];
    snapshot.forEach(doc => {
      const task = doc.data();
      const startTime = task.taskStartTime?.toDate?.() || new Date(task.taskStartTime);
      const now = new Date();
      const elapsedMs = now - startTime;
      const elapsedHours = elapsedMs / (1000 * 60 * 60);
      
      activeTasks.push({
        id: doc.id,
        ...task,
        taskStartTime: startTime,
        elapsedHours: Math.round(elapsedHours * 100) / 100,
        elapsedMinutes: Math.round(elapsedMs / (1000 * 60))
      });
    });
    
    return activeTasks;
  } catch (error) {
    console.error('Error getting active tasks:', error);
    throw error;
  }
};

/**
 * Cancel/stop an in-progress task
 */
export const cancelTask = async (taskId, caregiverId, reason = '') => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const task = taskSnap.data();
    
    if (task.status !== 'in_progress') {
      throw new Error('Task is not in progress');
    }
    
    // Calculate duration even if cancelled
    let duration = 0;
    let billableAmount = 0;
    
    if (task.taskStartTime) {
      const startTime = task.taskStartTime.toDate();
      const endTime = new Date();
      const durationMs = endTime - startTime;
      duration = durationMs / (1000 * 60 * 60);
      
      const billableDuration = Math.max(duration, 0.25);
      const hourlyRate = task.hourlyRate || 0;
      billableAmount = billableDuration * hourlyRate;
    }
    
    // Update task
    await updateDoc(taskRef, {
      status: 'cancelled',
      taskEndTime: serverTimestamp(),
      actualDuration: Math.round(duration * 100) / 100,
      cancellationReason: reason,
      updatedAt: serverTimestamp()
    });
    
    // Create tracking record
    await addDoc(collection(db, TASK_TIME_TRACKING_COLLECTION), {
      taskId,
      caregiverId,
      clientId: task.clientId || task.patientId,
      taskType: 'careTask',
      action: 'cancel',
      timestamp: serverTimestamp(),
      duration: duration,
      billableAmount: billableAmount,
      cancellationReason: reason,
      institutionId: task.institutionId,
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error cancelling task:', error);
    throw error;
  }
};

export default {
  startTask,
  completeTask,
  getWorkHours,
  getActiveTasks,
  cancelTask
};

