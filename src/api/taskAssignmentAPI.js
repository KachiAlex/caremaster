import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp
} from 'backend/database';
import { db } from '../backend/config';

const TASK_ASSIGNMENTS_COLLECTION = 'taskAssignments';
const NURSE_ASSIGNMENTS_COLLECTION = 'nurseAssignments';

// ===== TASK ASSIGNMENT API =====

// Create a new task assignment
export const createTaskAssignment = async (taskData) => {
  try {
    const assignmentsRef = collection(db, TASK_ASSIGNMENTS_COLLECTION);
    const newTask = {
      ...taskData,
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(assignmentsRef, newTask);
    return { id: docRef.id, ...newTask };
  } catch (error) {
    console.error('Error creating task assignment:', error);
    throw error;
  }
};

// Get all task assignments
export const getAllTaskAssignments = async () => {
  try {
    const assignmentsRef = collection(db, TASK_ASSIGNMENTS_COLLECTION);
    const q = query(assignmentsRef, orderBy('createdAt', 'desc'));
    const querySnapshot = await getDocs(q);
    
    const assignments = [];
    querySnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      assignments.push({
        id: doc.id,
        ...assignmentData,
        scheduledTime: assignmentData.scheduledTime?.toDate?.() || assignmentData.scheduledTime,
        dueDate: assignmentData.dueDate?.toDate?.() || assignmentData.dueDate,
        completedAt: assignmentData.completedAt?.toDate?.() || assignmentData.completedAt,
        createdAt: assignmentData.createdAt?.toDate?.() || assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt?.toDate?.() || assignmentData.updatedAt,
      });
    });
    
    return assignments;
  } catch (error) {
    console.error('Error fetching task assignments:', error);
    throw error;
  }
};

// Get task assignments by caregiver
export const getTaskAssignmentsByCaregiver = async (caregiverId) => {
  try {
    const assignmentsRef = collection(db, TASK_ASSIGNMENTS_COLLECTION);

    // Primary query: new schema where tasks include caregiverId
    const qByCaregiverId = query(
      assignmentsRef,
      where('caregiverId', '==', caregiverId)
    );

    // Fallback query: older tasks that used 'assignedTo' instead of 'caregiverId'
    const qByAssignedTo = query(
      assignmentsRef,
      where('assignedTo', '==', caregiverId)
    );

    const [snapByCaregiver, snapByAssigned] = await Promise.all([
      getDocs(qByCaregiverId).catch(() => ({ empty: true, docs: [] })),
      getDocs(qByAssignedTo).catch(() => ({ empty: true, docs: [] }))
    ]);

    const mapDoc = (docu) => {
      const assignmentData = docu.data();
      const scheduled = assignmentData.scheduledTime?.toDate?.() || assignmentData.scheduledTime || assignmentData.dueDate?.toDate?.() || assignmentData.dueDate;
      return {
        id: docu.id,
        ...assignmentData,
        caregiverId: assignmentData.caregiverId || assignmentData.assignedTo || caregiverId,
        scheduledTime: scheduled,
        dueDate: assignmentData.dueDate?.toDate?.() || assignmentData.dueDate,
        completedAt: assignmentData.completedAt?.toDate?.() || assignmentData.completedAt,
        createdAt: assignmentData.createdAt?.toDate?.() || assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt?.toDate?.() || assignmentData.updatedAt,
      };
    };

    const merged = [...snapByCaregiver.docs.map(mapDoc), ...snapByAssigned.docs.map(mapDoc)];

    // Deduplicate by id
    const unique = Array.from(new Map(merged.map(a => [a.id, a])).values());

    // Sort in memory by scheduledTime asc, fallback to createdAt
    unique.sort((a, b) => {
      const aTime = (a.scheduledTime ? new Date(a.scheduledTime) : (a.createdAt ? new Date(a.createdAt) : new Date(0))).getTime();
      const bTime = (b.scheduledTime ? new Date(b.scheduledTime) : (b.createdAt ? new Date(b.createdAt) : new Date(0))).getTime();
      return aTime - bTime;
    });

    return unique;
  } catch (error) {
    console.error('Error fetching caregiver task assignments:', error);
    throw error;
  }
};

// Update task assignment
export const updateTaskAssignment = async (assignmentId, updateData) => {
  try {
    const assignmentRef = doc(db, TASK_ASSIGNMENTS_COLLECTION, assignmentId);
    const updatedData = {
      ...updateData,
      updatedAt: serverTimestamp(),
    };
    
    await updateDoc(assignmentRef, updatedData);
    return true;
  } catch (error) {
    console.error('Error updating task assignment:', error);
    throw error;
  }
};

// Complete task assignment
export const completeTaskAssignment = async (assignmentId, completionNotes, photos = []) => {
  try {
    const assignmentRef = doc(db, TASK_ASSIGNMENTS_COLLECTION, assignmentId);
    await updateDoc(assignmentRef, {
      status: 'completed',
      completedAt: serverTimestamp(),
      completionNotes,
      photos,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error completing task assignment:', error);
    throw error;
  }
};

// Delete task assignment
export const deleteTaskAssignment = async (assignmentId) => {
  try {
    const assignmentRef = doc(db, TASK_ASSIGNMENTS_COLLECTION, assignmentId);
    await deleteDoc(assignmentRef);
    return true;
  } catch (error) {
    console.error('Error deleting task assignment:', error);
    throw error;
  }
};

// Get task assignment statistics
export const getTaskAssignmentStats = async () => {
  try {
    const assignments = await getAllTaskAssignments();
    
    const stats = {
      total: assignments.length,
      pending: assignments.filter(task => task.status === 'pending').length,
      inProgress: assignments.filter(task => task.status === 'in_progress').length,
      completed: assignments.filter(task => task.status === 'completed').length,
      overdue: assignments.filter(task => {
        if (task.status === 'pending' && task.dueDate) {
          return new Date(task.dueDate) < new Date();
        }
        return false;
      }).length,
    };
    
    return stats;
  } catch (error) {
    console.error('Error getting task assignment stats:', error);
    throw error;
  }
};

// Real-time listener for task assignments
export const subscribeToTaskAssignments = (callback, caregiverId = null) => {
  const assignmentsRef = collection(db, TASK_ASSIGNMENTS_COLLECTION);
  let q;

  if (caregiverId) {
    q = query(
      assignmentsRef,
      where('caregiverId', '==', caregiverId),
      orderBy('scheduledTime', 'asc')
    );
  } else {
    q = query(assignmentsRef, orderBy('createdAt', 'desc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const assignments = [];
    querySnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      assignments.push({
        id: doc.id,
        ...assignmentData,
        scheduledTime: assignmentData.scheduledTime?.toDate?.() || assignmentData.scheduledTime,
        dueDate: assignmentData.dueDate?.toDate?.() || assignmentData.dueDate,
        completedAt: assignmentData.completedAt?.toDate?.() || assignmentData.completedAt,
        createdAt: assignmentData.createdAt?.toDate?.() || assignmentData.createdAt,
        updatedAt: assignmentData.updatedAt?.toDate?.() || assignmentData.updatedAt,
      });
    });
    callback(assignments);
  });
};

// ===== NURSE ASSIGNMENT API =====

// Assign nurse to Client
export const assignNurseToPatient = async (nurseId, clientId, assignmentData = {}) => {
  try {
    const assignmentsRef = collection(db, NURSE_ASSIGNMENTS_COLLECTION);
    const assignment = {
      nurseId,
      clientId,
      status: 'active',
      assignedAt: serverTimestamp(),
      ...assignmentData
    };
    
    const docRef = await addDoc(assignmentsRef, assignment);
    return { id: docRef.id, ...assignment };
  } catch (error) {
    console.error('Error assigning nurse to Client:', error);
    throw error;
  }
};

// Get nurse assignments
export const getNurseAssignments = async (nurseId = null) => {
  try {
    const assignmentsRef = collection(db, NURSE_ASSIGNMENTS_COLLECTION);
    let q;
    
    if (nurseId) {
      q = query(
        assignmentsRef,
        where('nurseId', '==', nurseId),
        orderBy('assignedAt', 'desc')
      );
    } else {
      q = query(assignmentsRef, orderBy('assignedAt', 'desc'));
    }
    
    const querySnapshot = await getDocs(q);
    const assignments = [];
    
    querySnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      assignments.push({
        id: doc.id,
        ...assignmentData,
        assignedAt: assignmentData.assignedAt?.toDate?.() || assignmentData.assignedAt,
        updatedAt: assignmentData.updatedAt?.toDate?.() || assignmentData.updatedAt,
      });
    });
    
    return assignments;
  } catch (error) {
    console.error('Error fetching nurse assignments:', error);
    throw error;
  }
};

// Get clients assigned to a nurse
export const getPatientsAssignedToNurse = async (nurseId) => {
  try {
    const assignments = await getNurseAssignments(nurseId);
    const activeAssignments = assignments.filter(assignment => assignment.status === 'active');
    
    // Get Client details for each assignment
    const patientsWithDetails = await Promise.all(
      activeAssignments.map(async (assignment) => {
        try {
          const patientRef = doc(db, 'clients', assignment.clientId);
          const patientSnap = await getDoc(patientRef);
          
          if (patientSnap.exists()) {
            return {
              ...assignment,
              Client: { id: patientSnap.id, ...patientSnap.data() }
            };
          }
          return assignment;
        } catch (error) {
          console.error('Error fetching Client details:', error);
          return assignment;
        }
      })
    );
    
    return patientsWithDetails;
  } catch (error) {
    console.error('Error fetching clients assigned to nurse:', error);
    throw error;
  }
};

// Update nurse assignment status
export const updateNurseAssignmentStatus = async (assignmentId, status, notes = '') => {
  try {
    const assignmentRef = doc(db, NURSE_ASSIGNMENTS_COLLECTION, assignmentId);
    await updateDoc(assignmentRef, {
      status,
      notes,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error updating nurse assignment status:', error);
    throw error;
  }
};

// Real-time listener for nurse assignments
export const subscribeToNurseAssignments = (callback, nurseId = null) => {
  const assignmentsRef = collection(db, NURSE_ASSIGNMENTS_COLLECTION);
  let q;

  if (nurseId) {
    q = query(
      assignmentsRef,
      where('nurseId', '==', nurseId),
      orderBy('assignedAt', 'desc')
    );
  } else {
    q = query(assignmentsRef, orderBy('assignedAt', 'desc'));
  }
  
  return onSnapshot(q, (querySnapshot) => {
    const assignments = [];
    querySnapshot.forEach((doc) => {
      const assignmentData = doc.data();
      assignments.push({
        id: doc.id,
        ...assignmentData,
        assignedAt: assignmentData.assignedAt?.toDate?.() || assignmentData.assignedAt,
        updatedAt: assignmentData.updatedAt?.toDate?.() || assignmentData.updatedAt,
      });
    });
    callback(assignments);
  });
};
