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
} from 'backend/database';
import { db } from '../backend/config';

const CARE_TASKS_COLLECTION = 'careTasks';

// Get all care tasks
export const getAllCareTasks = async () => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    try {
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
      if (error.code === 'failed-precondition' || error.message?.includes('index')) {
        // Fallback: fetch without orderBy, sort in memory
        const snapshot = await getDocs(query(tasksRef));
        const tasks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        tasks.sort((a, b) => {
          const toMs = (v) => !v ? 0 : (v.toDate ? v.toDate().getTime() : (v.getTime ? v.getTime() : new Date(v).getTime() || 0));
          return toMs(b.createdAt) - toMs(a.createdAt);
        });
        return tasks;
      }
      throw error;
    }
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

// Get care tasks for a Client
export const getCareTasksByClient = async (clientId) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef, 
      where('clientId', '==', clientId),
      orderBy('scheduledTime', 'desc')
    );
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(tasksRef, where('clientId', '==', clientId));
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime desc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return bTime - aTime; // desc
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('Error fetching Client care tasks:', error);
    throw error;
  }
};

// Get care tasks for a caregiver with enhanced filtering
export const getCareTasksByCaregiver = async (caregiverId, options = {}) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    let q = query(tasksRef, where('caregiverId', '==', caregiverId));
    
    // Add status filtering if provided
    if (options.status) {
      q = query(q, where('status', '==', options.status));
    }
    
    // Add date range filtering if provided
    if (options.startDate && options.endDate) {
      const startTimestamp = Timestamp.fromDate(new Date(options.startDate));
      const endTimestamp = Timestamp.fromDate(new Date(options.endDate));
      q = query(q, where('scheduledTime', '>=', startTimestamp), where('scheduledTime', '<=', endTimestamp));
    }
    
    q = query(q, orderBy('scheduledTime', 'asc'));
    
    // Add limit if provided
    if (options.limit) {
      q = query(q, limit(options.limit));
    }
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        // Rebuild query from scratch with just the where clauses, no orderBy
        let fallbackQ = query(tasksRef, where('caregiverId', '==', caregiverId));
        if (options.status) {
          fallbackQ = query(fallbackQ, where('status', '==', options.status));
        }
        if (options.startDate && options.endDate) {
          const startTimestamp = Timestamp.fromDate(new Date(options.startDate));
          const endTimestamp = Timestamp.fromDate(new Date(options.endDate));
          fallbackQ = query(fallbackQ, where('scheduledTime', '>=', startTimestamp), where('scheduledTime', '<=', endTimestamp));
        }
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
      // Apply limit in memory if needed
      if (options.limit) {
        tasks = tasks.slice(0, options.limit);
      }
    }
    
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
// Note: For time tracking, use taskTimeTrackingAPI.completeTask() instead
// This function is kept for backward compatibility
export const completeCareTask = async (taskId, completionNotes, photos = []) => {
  try {
    const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
    const taskSnap = await getDoc(taskRef);
    
    if (!taskSnap.exists()) {
      throw new Error('Task not found');
    }
    
    const task = taskSnap.data();
    
    // If task has time tracking (was started), use time tracking API
    if (task.taskStartTime && task.status === 'in_progress') {
      // Import dynamically to avoid circular dependency
      const { completeTask } = await import('./taskTimeTrackingAPI');
      const caregiverId = task.caregiverId || task.assignedTo;
      if (caregiverId) {
        return await completeTask(taskId, caregiverId, completionNotes, photos);
      }
    }
    
    // Fallback to simple completion without time tracking
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

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(
          tasksRef,
          where('caregiverId', '==', caregiverId),
          where('scheduledTime', '>=', Timestamp.fromDate(today)),
          where('scheduledTime', '<', Timestamp.fromDate(tomorrow))
        );
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }

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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
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

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(
          tasksRef,
          where('caregiverId', '==', caregiverId),
          where('status', '==', 'pending')
        );
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }

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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
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

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(tasksRef, where('status', '==', status));
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }

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
    
    if (usedFallback) {
      // Sort in memory by createdAt desc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || new Date(a.createdAt).getTime() || 0;
        const bTime = b.createdAt?.getTime?.() || new Date(b.createdAt).getTime() || 0;
        return bTime - aTime; // desc
      });
    }
    
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
  
  const processSnapshot = (querySnapshot) => {
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
  };
  
  const sortTasksInMemory = (tasks) => {
    if (caregiverId) {
      // Original orderBy was scheduledTime asc
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    } else {
      // Original orderBy was createdAt desc
      tasks.sort((a, b) => {
        const aTime = a.createdAt?.getTime?.() || new Date(a.createdAt).getTime() || 0;
        const bTime = b.createdAt?.getTime?.() || new Date(b.createdAt).getTime() || 0;
        return bTime - aTime; // desc
      });
    }
  };
  
  let fallbackUnsubscribe = null;
  
  const unsubscribe = onSnapshot(q, processSnapshot, (error) => {
    if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
      console.warn('Index missing, using fallback snapshot query:', error.message);
      // Fallback: query without orderBy, sort in memory
      let fallbackQ;
      if (caregiverId) {
        fallbackQ = query(tasksRef, where('caregiverId', '==', caregiverId));
      } else {
        fallbackQ = query(tasksRef);
      }
      fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
        const tasks = [];
        snapshot.forEach((doc) => {
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
        sortTasksInMemory(tasks);
        callback(tasks);
      }, (err) => {
        console.error('Fallback snapshot error:', err);
        callback([]);
      });
    } else {
      console.error('Snapshot error:', error);
      callback([]);
    }
  });
  
  return () => {
    unsubscribe();
    if (fallbackUnsubscribe) fallbackUnsubscribe();
  };
};

// Get today's tasks for a caregiver
export const getTodayTasks = async (caregiverId) => {
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

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(
          tasksRef,
          where('caregiverId', '==', caregiverId),
          where('scheduledTime', '>=', Timestamp.fromDate(today)),
          where('scheduledTime', '<', Timestamp.fromDate(tomorrow))
        );
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }

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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('Error fetching today\'s tasks:', error);
    throw error;
  }
};

// Get upcoming tasks for a caregiver (next 7 days)
export const getUpcomingTasks = async (caregiverId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('caregiverId', '==', caregiverId),
      where('scheduledTime', '>=', Timestamp.fromDate(today)),
      where('scheduledTime', '<=', Timestamp.fromDate(nextWeek)),
      orderBy('scheduledTime', 'asc')
    );

    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(
          tasksRef,
          where('caregiverId', '==', caregiverId),
          where('scheduledTime', '>=', Timestamp.fromDate(today)),
          where('scheduledTime', '<=', Timestamp.fromDate(nextWeek))
        );
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }

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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
    return tasks;
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    throw error;
  }
};

// Real-time subscription for caregiver tasks
export const subscribeToCaregiverTasks = (caregiverId, callback, options = {}) => {
  try {
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    let q = query(
      tasksRef, 
      where('caregiverId', '==', caregiverId),
      orderBy('scheduledTime', 'asc')
    );
    
    // Add status filtering if provided
    if (options.status) {
      q = query(
        tasksRef, 
        where('caregiverId', '==', caregiverId),
        where('status', '==', options.status),
        orderBy('scheduledTime', 'asc')
      );
    }
    
    const processSnapshot = (querySnapshot) => {
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
    };
    
    let fallbackUnsubscribe = null;
    
    const unsubscribe = onSnapshot(q, processSnapshot, (error) => {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback snapshot query:', error.message);
        // Fallback: rebuild query without orderBy, sort in memory
        let fallbackQ = query(tasksRef, where('caregiverId', '==', caregiverId));
        if (options.status) {
          fallbackQ = query(fallbackQ, where('status', '==', options.status));
        }
        fallbackUnsubscribe = onSnapshot(fallbackQ, (snapshot) => {
          const tasks = [];
          snapshot.forEach((doc) => {
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
          // Sort in memory by scheduledTime asc (original orderBy)
          tasks.sort((a, b) => {
            const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
            const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
            return aTime - bTime; // asc
          });
          callback(tasks);
        }, (err) => {
          console.error('Fallback snapshot error:', err);
          callback([]);
        });
      } else {
        console.error('Error in real-time subscription:', error);
        callback([]);
      }
    });
    
    return () => {
      unsubscribe();
      if (fallbackUnsubscribe) fallbackUnsubscribe();
    };
  } catch (error) {
    console.error('Error setting up real-time subscription:', error);
    throw error;
  }
};

// Get task analytics for a caregiver
export const getCaregiverTaskAnalytics = async (caregiverId, dateRange = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - dateRange);
    
    const tasksRef = collection(db, CARE_TASKS_COLLECTION);
    const q = query(
      tasksRef,
      where('caregiverId', '==', caregiverId),
      where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
      where('scheduledTime', '<=', Timestamp.fromDate(endDate)),
      orderBy('scheduledTime', 'asc')
    );
    
    let querySnapshot;
    let usedFallback = false;
    try {
      querySnapshot = await getDocs(q);
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQ = query(
          tasksRef,
          where('caregiverId', '==', caregiverId),
          where('scheduledTime', '>=', Timestamp.fromDate(startDate)),
          where('scheduledTime', '<=', Timestamp.fromDate(endDate))
        );
        querySnapshot = await getDocs(fallbackQ);
        usedFallback = true;
      } else {
        throw error;
      }
    }
    
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
    
    if (usedFallback) {
      // Sort in memory by scheduledTime asc (original orderBy)
      tasks.sort((a, b) => {
        const aTime = a.scheduledTime?.getTime?.() || new Date(a.scheduledTime).getTime() || 0;
        const bTime = b.scheduledTime?.getTime?.() || new Date(b.scheduledTime).getTime() || 0;
        return aTime - bTime; // asc
      });
    }
    
    // Calculate analytics
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    const pendingTasks = tasks.filter(task => task.status === 'pending').length;
    const overdueTasks = tasks.filter(task => {
      if (task.status === 'completed') return false;
      return new Date(task.scheduledTime) < new Date();
    }).length;
    
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
    
    // Group by date for trend analysis
    const tasksByDate = {};
    tasks.forEach(task => {
      const date = new Date(task.scheduledTime).toISOString().split('T')[0];
      if (!tasksByDate[date]) {
        tasksByDate[date] = { total: 0, completed: 0, pending: 0 };
      }
      tasksByDate[date].total++;
      if (task.status === 'completed') {
        tasksByDate[date].completed++;
      } else {
        tasksByDate[date].pending++;
      }
    });
    
    return {
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks,
      completionRate: Math.round(completionRate * 100) / 100,
      tasksByDate,
      dateRange
    };
  } catch (error) {
    console.error('Error fetching task analytics:', error);
    throw error;
  }
};

// Bulk update task status
export const bulkUpdateTaskStatus = async (taskIds, status, caregiverId) => {
  try {
    const updatePromises = taskIds.map(taskId => {
      const taskRef = doc(db, CARE_TASKS_COLLECTION, taskId);
      const updateData = {
        status,
        updatedAt: serverTimestamp()
      };
      
      // If completing task, add completion timestamp
      if (status === 'completed') {
        updateData.completedAt = serverTimestamp();
      }
      
      return updateDoc(taskRef, updateData);
    });
    
    await Promise.all(updatePromises);
    return { success: true, updatedCount: taskIds.length };
  } catch (error) {
    console.error('Error bulk updating task status:', error);
    throw error;
  }
};