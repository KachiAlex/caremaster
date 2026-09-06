import {
  collection,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  addDoc,
  setDoc,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  getDoc
} from 'backend/database';
import { createStandardizedUserData } from '../utils/userCreationHelper';
import { db } from '../backend/config';

const CAREGIVER_ROLE_FIELDS = {
  userType: 'caregiver',
  type: 'caregiver',
  role: 'caregiver',
  roles: ['caregiver']
};

const CAREGIVER_STATUS_FIELDS = {
  status: 'pending',
  isActive: true,
  active: true
};

const ensureCaregiverUserDoc = async (caregiverId, caregiverData = {}) => {
  if (!caregiverId) return;

  const userRef = doc(db, 'users', caregiverId);
  const userSnap = await getDoc(userRef);

  const name = caregiverData.name || caregiverData.displayName || caregiverData.fullName || 'Caregiver';
  const [firstName, ...rest] = name.trim().split(' ');
  const lastName = rest.join(' ').trim();

  if (!userSnap.exists()) {
    const standardizedUser = createStandardizedUserData(
      {
        firstName: firstName || 'Caregiver',
        lastName: lastName || '',
        email: caregiverData.email || '',
        phone: caregiverData.phone || caregiverData.contactPhone || '',
        userType: 'caregiver'
      },
      {
        uid: caregiverId,
        institutionId: caregiverData.institutionId || caregiverData.organizationId || null,
        createdBy: caregiverData.createdBy || null,
        onboardingComplete: caregiverData.onboardingComplete ?? false,
        accountType: caregiverData.accountType || 'legacy_import'
      }
    );

    await setDoc(userRef, standardizedUser);
    return;
  }

  const userData = userSnap.data() || {};
  const roleNeedsFix =
    userData.userType !== 'caregiver' ||
    userData.type !== 'caregiver' ||
    userData.role !== 'caregiver' ||
    !Array.isArray(userData.roles) ||
    !userData.roles.includes('caregiver');

  const statusNeedsFix = userData.status === undefined || userData.status === 'deleted';
  const institutionNeedsFix = !userData.institutionId && caregiverData.institutionId;

  if (roleNeedsFix || statusNeedsFix || institutionNeedsFix) {
    await updateDoc(userRef, {
      ...CAREGIVER_ROLE_FIELDS,
      ...(institutionNeedsFix ? { institutionId: caregiverData.institutionId } : {}),
      ...(statusNeedsFix ? { status: 'active', isActive: true, active: true } : {}),
      updatedAt: serverTimestamp()
    });
  }
};

export const caregiverAPI = {
  // Get all caregivers with filtering
  getCaregivers: async (filters = {}) => {
    try {
      let caregiversQuery;
      
      // Handle institution filtering
      if (filters.institutionId) {
        // Query with institution filter (with fallback for missing index)
        try {
          caregiversQuery = query(
            collection(db, 'caregivers'),
            where('institutionId', '==', filters.institutionId),
            orderBy('createdAt', 'desc')
          );
          
          if (filters.limit) {
            caregiversQuery = query(caregiversQuery, limit(filters.limit));
          }
          
          const caregiversSnapshot = await getDocs(caregiversQuery);
          const caregivers = [];

          caregiversSnapshot.forEach((doc) => {
            const data = doc.data();
            caregivers.push({
              id: doc.id,
              ...data,
              // Handle both Database Timestamps and ISO strings
              joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : null),
              lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : null),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
            });
          });

          return caregivers;
        } catch (indexError) {
          console.warn('Database index not found for caregivers, using simpler query:', indexError);
          // Fallback: query without orderBy
          caregiversQuery = query(
            collection(db, 'caregivers'),
            where('institutionId', '==', filters.institutionId)
          );
          
          if (filters.limit) {
            caregiversQuery = query(caregiversQuery, limit(filters.limit));
          }
          
          const caregiversSnapshot = await getDocs(caregiversQuery);
          const caregivers = [];

          caregiversSnapshot.forEach((doc) => {
            const data = doc.data();
            caregivers.push({
              id: doc.id,
              ...data,
              // Handle both Database Timestamps and ISO strings
              joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : null),
              lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : null),
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
              updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
            });
          });
          
          // Sort in memory
          caregivers.sort((a, b) => {
            const aTime = a.createdAt?.getTime?.() || 0;
            const bTime = b.createdAt?.getTime?.() || 0;
            return bTime - aTime;
          });

          return caregivers;
        }
      }
      
      // Original logic for non-institution queries
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
        const data = doc.data();
        caregivers.push({
          id: doc.id,
          ...data,
          // Handle both Database Timestamps and ISO strings
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : null),
          lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
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
      // First, try to fetch from the users table (where the user actually
      // exists). This avoids 404 noise from querying the caregivers table
      // for users who don't have a caregiver row.
      try {
        const userRef = doc(db, 'users', caregiverId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();

          // If the user has a linked caregiver record, try to fetch it
          // for additional fields. This is a best-effort lookup — if it
          // 404s, we silently use the user data.
          let caregiverData = {};
          if (userData.caregiverId) {
            try {
              const caregiverRef = doc(db, 'caregivers', userData.caregiverId);
              const caregiverDoc = await getDoc(caregiverRef);
              if (caregiverDoc.exists()) {
                caregiverData = caregiverDoc.data();
              }
            } catch (e) {
              // Silently ignore — caregivers table row is optional
            }
          }

          const data = { ...caregiverData, ...userData };
          return {
            id: caregiverId,
            ...data,
            name: data.name || data.displayName || data.fullName || 'Caregiver',
            email: data.email || '',
            status: data.status || 'active',
            rating: data.rating || 0,
            totalPatients: data.totalPatients || 0,
            currentPatients: data.currentPatients || 0,
            thisMonthEarnings: data.thisMonthEarnings || 0,
            lastMonthEarnings: data.lastMonthEarnings || 0,
            specializations: data.specializations || ['General Care'],
            certifications: data.certifications || ['CPR Certified'],
            experience: data.experience || '1 year',
            qualificationLevel: data.qualificationLevel || 'basic',
            location: data.location || 'Lagos, Nigeria',
            joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : (data.createdAt ? new Date(data.createdAt) : new Date())),
            lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : new Date()),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : new Date()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : new Date())
          };
        }
      } catch (userLookupError) {
        // User lookup failed — fall through to caregivers table
      }

      // Fallback: try the caregivers table directly
      try {
        const caregiverRef = doc(db, 'caregivers', caregiverId);
        const caregiverDoc = await getDoc(caregiverRef);
        if (caregiverDoc.exists()) {
          const data = caregiverDoc.data();
          return {
            id: caregiverDoc.id,
            ...data,
            joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : null),
            lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : null),
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
          };
        }
      } catch (e) {
        // Silently ignore
      }

      // Ultimate fallback: return a default profile without making any
      // further network requests
      console.log('Caregiver profile not found, using default profile for user:', caregiverId);
      return {
        id: caregiverId,
        name: 'Caregiver',
        email: '',
        status: 'active',
        rating: 0,
        totalPatients: 0,
        currentPatients: 0,
        thisMonthEarnings: 0,
        lastMonthEarnings: 0,
        specializations: ['General Care'],
        certifications: ['CPR Certified'],
        experience: '1 year',
        qualificationLevel: 'basic',
        location: 'Lagos, Nigeria',
        joinDate: new Date(),
        lastActive: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
    } catch (error) {
      console.error('Error fetching caregiver:', error);
      throw error;
    }
  },

  // Create new caregiver with automatic user guardrails
  createCaregiver: async (caregiverData) => {
    try {
      const caregiverId =
        caregiverData.id ||
        caregiverData.userId ||
        caregiverData.uid ||
        `caregiver_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      const caregiverDocRef = doc(db, 'caregivers', caregiverId);
      await setDoc(
        caregiverDocRef,
        {
          id: caregiverId,
          ...caregiverData,
          ...CAREGIVER_ROLE_FIELDS,
          ...CAREGIVER_STATUS_FIELDS,
          rating: caregiverData.rating ?? 0,
          totalPatients: caregiverData.totalPatients ?? 0,
          currentPatients: caregiverData.currentPatients ?? 0,
          performance: caregiverData.performance || {
            punctuality: 0,
            patientSatisfaction: 0,
            taskCompletion: 0,
            communication: 0,
            safety: 0
          },
          earnings: caregiverData.earnings || {
            thisMonth: 0,
            lastMonth: 0,
            total: 0
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      await ensureCaregiverUserDoc(caregiverId, caregiverData);

      return { id: caregiverId, success: true };
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
      console.log('🗑️ Deleting caregiver:', caregiverId);
      
      // Delete from caregivers collection
      const caregiverRef = doc(db, 'caregivers', caregiverId);
      await deleteDoc(caregiverRef);
      console.log('✅ Deleted from caregivers collection');
      
      // Delete from users collection
      const userRef = doc(db, 'users', caregiverId);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        await deleteDoc(userRef);
        console.log('✅ Deleted from users collection');
      }
      
      // Note: Backend Auth user deletion requires admin SDK (backend function)
      // For now, we mark the account as deleted in the database
      // TODO: Implement backend function to delete from Backend Auth
      
      return { success: true };
    } catch (error) {
      console.error('Error deleting caregiver:', error);
      throw error;
    }
  },

  // Assign caregiver to Client
  assignCaregiverToPatient: async (caregiverId, clientId, assignmentData) => {
    try {
      const assignmentRef = await addDoc(collection(db, 'caregiverAssignments'), {
        caregiverId,
        clientId,
        ...assignmentData,
        status: 'active',
        assignedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update caregiver's current clients count
      await caregiverAPI.updateCaregiver(caregiverId, {
        currentPatients: await caregiverAPI.getCurrentPatientCount(caregiverId) + 1
      });

      return { id: assignmentRef.id, success: true };
    } catch (error) {
      console.error('Error assigning caregiver to Client:', error);
      throw error;
    }
  },

  // Remove caregiver from Client
  removeCaregiverFromPatient: async (caregiverId, clientId, reason) => {
    try {
      // Find and update the assignment
      const assignmentsQuery = query(
        collection(db, 'caregiverAssignments'),
        where('caregiverId', '==', caregiverId),
        where('clientId', '==', clientId),
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

        // Update caregiver's current clients count
        await caregiverAPI.updateCaregiver(caregiverId, {
          currentPatients: await caregiverAPI.getCurrentPatientCount(caregiverId) - 1
        });

        return { success: true };
      }
      
      throw new Error('Assignment not found');
    } catch (error) {
      console.error('Error removing caregiver from Client:', error);
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
        const data = doc.data();
        assignments.push({
          id: doc.id,
          ...data,
          // Handle both Database Timestamps and ISO strings
          assignedAt: data.assignedAt?.toDate ? data.assignedAt.toDate() : (data.assignedAt ? new Date(data.assignedAt) : null),
          endDate: data.endDate?.toDate ? data.endDate.toDate() : (data.endDate ? new Date(data.endDate) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
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
        const data = doc.data();
        schedule.push({
          id: doc.id,
          ...data,
          // Handle both Database Timestamps and ISO strings
          scheduledDate: data.scheduledDate?.toDate ? data.scheduledDate.toDate() : (data.scheduledDate ? new Date(data.scheduledDate) : null),
          startTime: data.startTime?.toDate ? data.startTime.toDate() : (data.startTime ? new Date(data.startTime) : null),
          endTime: data.endTime?.toDate ? data.endTime.toDate() : (data.endTime ? new Date(data.endTime) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
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
        const data = doc.data();
        earnings.push({
          id: doc.id,
          ...data,
          // Handle both Database Timestamps and ISO strings
          earnedDate: data.earnedDate?.toDate ? data.earnedDate.toDate() : (data.earnedDate ? new Date(data.earnedDate) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null)
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
          // Handle both Date objects and Database Timestamps
          const start = shift.actualStartTime instanceof Date ? shift.actualStartTime : (shift.actualStartTime.toDate ? shift.actualStartTime.toDate() : new Date(shift.actualStartTime));
          const end = shift.actualEndTime instanceof Date ? shift.actualEndTime : (shift.actualEndTime.toDate ? shift.actualEndTime.toDate() : new Date(shift.actualEndTime));
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

  // Get current Client count for caregiver
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
      console.error('Error getting current Client count:', error);
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
        const data = doc.data();
        caregivers.push({
          id: doc.id,
          ...data,
          // Handle both Database Timestamps and ISO strings
          joinDate: data.joinDate?.toDate ? data.joinDate.toDate() : (data.joinDate ? new Date(data.joinDate) : null),
          lastActive: data.lastActive?.toDate ? data.lastActive.toDate() : (data.lastActive ? new Date(data.lastActive) : null),
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : (data.createdAt ? new Date(data.createdAt) : null),
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : (data.updatedAt ? new Date(data.updatedAt) : null)
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
