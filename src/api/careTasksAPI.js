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

const CARE_TASKS_COLLECTION = 'careTasks';

// Get all care tasks
export const getAllCareTasks = async () => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(tasksRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching care tasks:', error);
    throw error;
  }
};

// Get care task by ID
export const getCareTaskById = async (taskId) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (taskSnap.exists()) {
      const taskData = taskSnap.data();
      return {
        id: taskSnap.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      };
    } else {
      throw new Error('Care task not found');
    }
  } catch (error) {
    console.error('Error fetching care task:', error);
    throw error;
  }
};

// Get care tasks for a patient
export const getCareTasksByPatient = async (patientId) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef, 
      where('patientId', '==', patientId),
      orderBy('scheduledTime', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching patient care tasks:', error);
    throw error;
  }
};

// Get care tasks for a caregiver
export const getCareTasksByCaregiver = async (caregiverId) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef, 
      where('caregiverId', '==', caregiverId),
      orderBy('scheduledTime', 'asc')
    );
    const querySnapshot = await getDocs(q);
    
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching caregiver care tasks:', error);
    throw error;
  }
};

// Create new care task
export const createCareTask = async (taskData) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const newTask = {
      ...taskData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(tasksRef, newTask);
    return docRef.id;
  } catch (error) {
    console.error('Error creating care task:', error);
    throw error;
  }
};

// Update care task
export const updateCareTask = async (taskId, updateData) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(taskRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating care task:', error);
    throw error;
  }
};

// Complete care task
export const completeCareTask = async (taskId, completionNotes, photos = []) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      completionNotes,
      photos,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error completing care task:', error);
    throw error;
  }
};

// Get today's care tasks for a caregiver
export const getTodaysCareTasks = async (caregiverId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('caregiverId', '==', caregiverId),
      where('scheduledTime', '>=', Timestamp.fromDate(today)),
      where('scheduledTime', '<', Timestamp.fromDate(tomorrow)),
      orderBy('scheduledTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching today\'s care tasks:', error);
    throw error;
  }
};

// Get pending care tasks for a caregiver
export const getPendingCareTasks = async (caregiverId) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('caregiverId', '==', caregiverId),
      where('status', '==', 'pending'),
      orderBy('scheduledTime', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching pending care tasks:', error);
    throw error;
  }
};

// Get care tasks by status
export const getCareTasksByStatus = async (status) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );

    const querySnapshot = await getDocs(q);
    const tasks = [];
    
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    
    return tasks;
  } catch (error) {
    console.error('Error fetching care tasks by status:', error);
    throw error;
  }
};

// Assign care task to caregiver
export const assignCareTaskToCaregiver = async (taskId, caregiverId) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    await updateDoc(taskRef, {
      caregiverId,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error assigning care task:', error);
    throw error;
  }
};

// Get care task statistics
export const getCareTaskStats = async (caregiverId = null) => {
  try {
    let tasks;
    if (caregiverId) {
      tasks = await getCareTasksByCaregiver(caregiverId);
    } else {
      tasks = await getAllCareTasks();
    }
    
    const stats = {
      total: tasks.length,
      pending: tasks.filter(task => task.status === 'pending').length,
      inProgress: tasks.filter(task => task.status === 'in_progress').length,
      completed: tasks.filter(task => task.status === 'completed').length,
      overdue: tasks.filter(task => {
        if (task.status === 'pending' && task.scheduledTime) {
          return new Date(task.scheduledTime) < new Date();
        }
        return false;
      }).length,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting care task stats:', error);
    throw error;
  }
};

// Create recurring care tasks
export const createRecurringCareTask = async (taskData, recurrencePattern) => {
  try {
    const tasks = [];
    const startDate = new Date(taskData.scheduledTime);
    
    // Create tasks based on recurrence pattern
    for (let i = 0; i < recurrencePattern.count; i++) {
      const scheduledTime = new Date(startDate);
      
      switch (recurrencePattern.type) {
        case 'daily':
          scheduledTime.setDate(startDate.getDate() + i);
          break;
        case 'weekly':
          scheduledTime.setDate(startDate.getDate() + (i * 7));
          break;
        case 'monthly':
          scheduledTime.setMonth(startDate.getMonth() + i);
          break;
        default:
          break;
      }
      
      const recurringTask = {
        ...taskData,
        scheduledTime: Timestamp.fromDate(scheduledTime),
        isRecurring: true,
        recurrenceId: taskData.recurrenceId || `recur_${Date.now()}`,
        recurrenceIndex: i,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      const tasksRef = collection(db, CARE_TASKS_COLLECTION);
      const docRef = await addDoc(tasksRef, recurringTask);
      tasks.push(docRef.id);
    }
    
    return tasks;
  } catch (error) {
    console.error('Error creating recurring care tasks:', error);
    throw error;
  }
};

// Real-time listener for care tasks
export const subscribeToCareTasks = (callback, caregiverId = null) => {
  const tasksRef = collection(db, CARE_TASKS_COLLECTION);
  let q;

  if (caregiverId) {
    q = query(
      tasksRef,
      where('caregiverId', '==', caregiverId),
      orderBy('scheduledTime', 'asc')
    );
  } else {
    q = query(tasksRef, orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const tasks = [];
    querySnapshot.forEach((doc) => {
      const taskData = doc.data();
      tasks.push({
        id: doc.id,
        ...taskData,
        scheduledTime: taskData.scheduledTime?.toDate?.() || taskData.scheduledTime,
        completedAt: taskData.completedAt?.toDate?.() || taskData.completedAt,
        createdAt: taskData.createdAt?.toDate?.() || taskData.createdAt,
        updatedAt: taskData.updatedAt?.toDate?.() || taskData.updatedAt,
      });
    });
    callback(tasks);
  });
};
