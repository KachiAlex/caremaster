import { db } from '../firebase/config';
import { 
  collection, 
  query, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc,
  addDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

export const caregiverAPI = {
  // Get all caregivers with filtering
  getCaregivers: async (filters = {}) => {
    try {
      let caregiversQuery;
      
      if (filters.status) {
        // Use the indexed query when status filter is provided
        caregiversQuery = query(
          collection(db, 'caregivers'),
          where('status', '==', filters.status),
          orderBy('joinDate', 'asc')
        );
      } else {
        // Simple query without complex ordering when no status filter
        caregiversQuery = query(
          collection(db, 'caregivers'),
          orderBy('joinDate', 'desc')
        );
      }
      
      if (filters.location && !filters.status) {
        caregiversQuery = query(caregiversQuery, where('location', '==', filters.location));
      }
      
      if (filters.specialization && !filters.status) {
        caregiversQuery = query(caregiversQuery, where('specializations', 'array-contains', filters.specialization));
      }
      
      if (filters.limit) {
        caregiversQuery = query(caregiversQuery, limit(filters.limit));
      }

      const caregiversSnapshot = await getDocs(caregiversQuery);
      const caregivers = [];

      caregiversSnapshot.forEach((doc) => {
        caregivers.push({
          id: doc.id,
          ...doc.data(),
          joinDate: doc.data().joinDate?.toDate(),
          lastActive: doc.data().lastActive?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return caregivers;
    } catch (error) {
      console.error('Error fetching caregivers:', error);
      throw error;
    }
  },

  // Get caregiver by ID
  getCaregiverById: async (caregiverId) => {
    try {
      const caregiverRef = doc(db, 'caregivers', caregiverId);
      const caregiverDoc = await getDoc(caregiverRef);
      
      if (caregiverDoc.exists()) {
        return {
          id: caregiverDoc.id,
          ...caregiverDoc.data(),
          joinDate: caregiverDoc.data().joinDate?.toDate(),
          lastActive: caregiverDoc.data().lastActive?.toDate(),
          createdAt: caregiverDoc.data().createdAt?.toDate(),
          updatedAt: caregiverDoc.data().updatedAt?.toDate()
        };
      }
      
      throw new Error('Caregiver not found');
    } catch (error) {
      console.error('Error fetching caregiver:', error);
      throw error;
    }
  },

  // Create new caregiver
  createCaregiver: async (caregiverData) => {
    try {
      const caregiverRef = await addDoc(collection(db, 'caregivers'), {
        ...caregiverData,
        status: 'pending',
        rating: 0,
        totalPatients: 0,
        currentPatients: 0,
        performance: {
          punctuality: 0,
          patientSatisfaction: 0,
          taskCompletion: 0,
          communication: 0,
          safety: 0
        },
        earnings: {
          thisMonth: 0,
          lastMonth: 0,
          total: 0
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: caregiverRef.id, success: true };
    } catch (error) {
      console.error('Error creating caregiver:', error);
      throw error;
    }
  },

  // Update caregiver
  updateCaregiver: async (caregiverId, updates) => {
    try {
      const caregiverRef = doc(db, 'caregivers', caregiverId);
      await updateDoc(caregiverRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating caregiver:', error);
      throw error;
    }
  },

  // Delete caregiver
  deleteCaregiver: async (caregiverId) => {
    try {
      const caregiverRef = doc(db, 'caregivers', caregiverId);
      await deleteDoc(caregiverRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      throw error;
    }
  },

  // Assign caregiver to patient
  assignCaregiverToPatient: async (caregiverId, patientId, assignmentData) => {
    try {
      const assignmentRef = await addDoc(collection(db, 'caregiverAssignments'), {
        caregiverId,
        patientId,
        ...assignmentData,
        status: 'active',
        assignedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update caregiver's current patients count
      await caregiverAPI.updateCaregiver(caregiverId, {
        currentPatients: await caregiverAPI.getCurrentPatientCount(caregiverId) + 1
      });

      return { id: assignmentRef.id, success: true };
    } catch (error) {
      console.error('Error assigning caregiver to patient:', error);
      throw error;
    }
  },

  // Remove caregiver from patient
  removeCaregiverFromPatient: async (caregiverId, patientId, reason) => {
    try {
      // Find and update the assignment
      const assignmentsQuery = query(
        collection(db, 'caregiverAssignments'),
        where('caregiverId', '==', caregiverId),
        where('patientId', '==', patientId),
        where('status', '==', 'active')
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      
      if (!assignmentsSnapshot.empty) {
        const assignmentDoc = assignmentsSnapshot.docs[0];
        await updateDoc(assignmentDoc.ref, {
          status: 'inactive',
          endDate: serverTimestamp(),
          reason: reason,
          updatedAt: serverTimestamp()
        });

        // Update caregiver's current patients count
        await caregiverAPI.updateCaregiver(caregiverId, {
          currentPatients: await caregiverAPI.getCurrentPatientCount(caregiverId) - 1
        });

        return { success: true };
      }
      
      throw new Error('Assignment not found');
    } catch (error) {
      console.error('Error removing caregiver from patient:', error);
      throw error;
    }
  },

  // Get caregiver assignments
  getCaregiverAssignments: async (caregiverId, filters = {}) => {
    try {
      let assignmentsQuery = query(
        collection(db, 'caregiverAssignments'),
        where('caregiverId', '==', caregiverId),
        orderBy('assignedAt', 'desc')
      );
      
      if (filters.status) {
        assignmentsQuery = query(assignmentsQuery, where('status', '==', filters.status));
      }
      
      if (filters.limit) {
        assignmentsQuery = query(assignmentsQuery, limit(filters.limit));
      }

      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      const assignments = [];

      assignmentsSnapshot.forEach((doc) => {
        assignments.push({
          id: doc.id,
          ...doc.data(),
          assignedAt: doc.data().assignedAt?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return assignments;
    } catch (error) {
      console.error('Error fetching caregiver assignments:', error);
      throw error;
    }
  },

  // Record caregiver performance
  recordPerformance: async (caregiverId, performanceData) => {
    try {
      const performanceRef = await addDoc(collection(db, 'caregiverPerformance'), {
        caregiverId,
        ...performanceData,
        recordedAt: serverTimestamp()
      });

      // Update caregiver's overall performance
      await caregiverAPI.updateCaregiverPerformance(caregiverId);

      return { id: performanceRef.id, success: true };
    } catch (error) {
      console.error('Error recording performance:', error);
      throw error;
    }
  },

  // Update caregiver performance metrics
  updateCaregiverPerformance: async (caregiverId) => {
    try {
      // Get recent performance records
      const performanceQuery = query(
        collection(db, 'caregiverPerformance'),
        where('caregiverId', '==', caregiverId),
        orderBy('recordedAt', 'desc'),
        limit(30) // Last 30 records
      );
      
      const performanceSnapshot = await getDocs(performanceQuery);
      
      if (performanceSnapshot.empty) return;

      let totalPunctuality = 0;
      let totalSatisfaction = 0;
      let totalTaskCompletion = 0;
      let totalCommunication = 0;
      let totalSafety = 0;
      let count = 0;

      performanceSnapshot.forEach((doc) => {
        const data = doc.data();
        totalPunctuality += data.punctuality || 0;
        totalSatisfaction += data.patientSatisfaction || 0;
        totalTaskCompletion += data.taskCompletion || 0;
        totalCommunication += data.communication || 0;
        totalSafety += data.safety || 0;
        count++;
      });

      const avgPerformance = {
        punctuality: Math.round(totalPunctuality / count),
        patientSatisfaction: Math.round((totalSatisfaction / count) * 10) / 10,
        taskCompletion: Math.round(totalTaskCompletion / count),
        communication: Math.round((totalCommunication / count) * 10) / 10,
        safety: Math.round(totalSafety / count)
      };

      await caregiverAPI.updateCaregiver(caregiverId, {
        performance: avgPerformance
      });

      return avgPerformance;
    } catch (error) {
      console.error('Error updating caregiver performance:', error);
      throw error;
    }
  },

  // Get caregiver schedule
  getCaregiverSchedule: async (caregiverId, dateRange = {}) => {
    try {
      let scheduleQuery = query(
        collection(db, 'caregiverSchedule'),
        where('caregiverId', '==', caregiverId),
        orderBy('scheduledDate', 'asc')
      );
      
      if (dateRange.startDate && dateRange.endDate) {
        scheduleQuery = query(
          scheduleQuery,
          where('scheduledDate', '>=', dateRange.startDate),
          where('scheduledDate', '<=', dateRange.endDate)
        );
      }

      const scheduleSnapshot = await getDocs(scheduleQuery);
      const schedule = [];

      scheduleSnapshot.forEach((doc) => {
        schedule.push({
          id: doc.id,
          ...doc.data(),
          scheduledDate: doc.data().scheduledDate?.toDate(),
          startTime: doc.data().startTime?.toDate(),
          endTime: doc.data().endTime?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return schedule;
    } catch (error) {
      console.error('Error fetching caregiver schedule:', error);
      throw error;
    }
  },

  // Clock in/out for caregiver
  clockInOut: async (caregiverId, scheduleId, action, location = null) => {
    try {
      const clockRecord = await addDoc(collection(db, 'caregiverClockRecords'), {
        caregiverId,
        scheduleId,
        action, // 'clock_in' or 'clock_out'
        location,
        timestamp: serverTimestamp()
      });

      // Update schedule status
      const scheduleRef = doc(db, 'caregiverSchedule', scheduleId);
      const updateData = {
        updatedAt: serverTimestamp()
      };

      if (action === 'clock_in') {
        updateData.status = 'in_progress';
        updateData.actualStartTime = serverTimestamp();
      } else if (action === 'clock_out') {
        updateData.status = 'completed';
        updateData.actualEndTime = serverTimestamp();
      }

      await updateDoc(scheduleRef, updateData);

      return { id: clockRecord.id, success: true };
    } catch (error) {
      console.error('Error recording clock in/out:', error);
      throw error;
    }
  },

  // Get caregiver earnings
  getCaregiverEarnings: async (caregiverId, dateRange = {}) => {
    try {
      let earningsQuery = query(
        collection(db, 'caregiverEarnings'),
        where('caregiverId', '==', caregiverId),
        orderBy('earnedDate', 'desc')
      );
      
      if (dateRange.startDate && dateRange.endDate) {
        earningsQuery = query(
          earningsQuery,
          where('earnedDate', '>=', dateRange.startDate),
          where('earnedDate', '<=', dateRange.endDate)
        );
      }

      const earningsSnapshot = await getDocs(earningsQuery);
      const earnings = [];

      earningsSnapshot.forEach((doc) => {
        earnings.push({
          id: doc.id,
          ...doc.data(),
          earnedDate: doc.data().earnedDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate()
        });
      });

      return earnings;
    } catch (error) {
      console.error('Error fetching caregiver earnings:', error);
      throw error;
    }
  },

  // Get caregiver analytics
  getCaregiverAnalytics: async (caregiverId, dateRange = {}) => {
    try {
      const analytics = {
        totalHours: 0,
        totalEarnings: 0,
        averageRating: 0,
        taskCompletionRate: 0,
        punctualityRate: 0,
        patientSatisfaction: 0
      };

      // Get schedule data
      const schedule = await caregiverAPI.getCaregiverSchedule(caregiverId, dateRange);
      analytics.totalHours = schedule.reduce((total, shift) => {
        if (shift.actualStartTime && shift.actualEndTime) {
          const start = shift.actualStartTime.toDate();
          const end = shift.actualEndTime.toDate();
          return total + (end - start) / (1000 * 60 * 60); // Convert to hours
        }
        return total;
      }, 0);

      // Get earnings data
      const earnings = await caregiverAPI.getCaregiverEarnings(caregiverId, dateRange);
      analytics.totalEarnings = earnings.reduce((total, earning) => total + earning.amount, 0);

      // Get performance data
      const caregiver = await caregiverAPI.getCaregiverById(caregiverId);
      analytics.averageRating = caregiver.rating;
      analytics.taskCompletionRate = caregiver.performance.taskCompletion;
      analytics.punctualityRate = caregiver.performance.punctuality;
      analytics.patientSatisfaction = caregiver.performance.patientSatisfaction;

      return analytics;
    } catch (error) {
      console.error('Error fetching caregiver analytics:', error);
      throw error;
    }
  },

  // Get current patient count for caregiver
  getCurrentPatientCount: async (caregiverId) => {
    try {
      const assignmentsQuery = query(
        collection(db, 'caregiverAssignments'),
        where('caregiverId', '==', caregiverId),
        where('status', '==', 'active')
      );
      
      const assignmentsSnapshot = await getDocs(assignmentsQuery);
      return assignmentsSnapshot.size;
    } catch (error) {
      console.error('Error getting current patient count:', error);
      return 0;
    }
  },

  // Subscribe to caregiver updates
  subscribeToCaregivers: (callback) => {
    const caregiversQuery = query(
      collection(db, 'caregivers'),
      orderBy('updatedAt', 'desc')
    );
    
    return onSnapshot(caregiversQuery, (snapshot) => {
      const caregivers = [];
      snapshot.forEach((doc) => {
        caregivers.push({
          id: doc.id,
          ...doc.data(),
          joinDate: doc.data().joinDate?.toDate(),
          lastActive: doc.data().lastActive?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(caregivers);
    });
  },

  // Subscribe to caregiver assignments
  subscribeToCaregiverAssignments: (caregiverId, callback) => {
    const assignmentsQuery = query(
      collection(db, 'caregiverAssignments'),
      where('caregiverId', '==', caregiverId),
      orderBy('assignedAt', 'desc')
    );
    
    return onSnapshot(assignmentsQuery, (snapshot) => {
      const assignments = [];
      snapshot.forEach((doc) => {
        assignments.push({
          id: doc.id,
          ...doc.data(),
          assignedAt: doc.data().assignedAt?.toDate(),
          endDate: doc.data().endDate?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(assignments);
    });
  }
};
