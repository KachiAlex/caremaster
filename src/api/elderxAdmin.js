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
  startAfter,
  getCountFromServer
} from 'firebase/firestore';

export const elderxAdminAPI = {
  // Dashboard Statistics
  getDashboardStats: async () => {
    try {
      // Get user counts by type
      const usersQuery = query(collection(db, 'users'));
      const usersSnapshot = await getDocs(usersQuery);
      
      const userStats = {
        total: 0,
        elderly: 0,
        caregivers: 0,
        doctors: 0
      };

      usersSnapshot.forEach((doc) => {
        const userData = doc.data();
        userStats.total++;
        if (userData.userType === 'elderly') userStats.elderly++;
        else if (userData.userType === 'caregiver') userStats.caregivers++;
        else if (userData.userType === 'doctor') userStats.doctors++;
      });

      // Get appointment counts
      const appointmentsQuery = query(collection(db, 'appointments'));
      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointmentStats = {
        total: appointmentsSnapshot.size,
        today: 0,
        thisWeek: 0
      };

      const today = new Date();
      const weekStart = new Date(today.setDate(today.getDate() - today.getDay()));

      appointmentsSnapshot.forEach((doc) => {
        const appointmentData = doc.data();
        const appointmentDate = appointmentData.dateTime.toDate();
        
        if (appointmentDate.toDateString() === new Date().toDateString()) {
          appointmentStats.today++;
        }
        
        if (appointmentDate >= weekStart) {
          appointmentStats.thisWeek++;
        }
      });

      // Get medication reminders
      const medicationsQuery = query(collection(db, 'medications'));
      const medicationsSnapshot = await getDocs(medicationsQuery);
      const medicationStats = {
        total: medicationsSnapshot.size,
        active: 0
      };

      medicationsSnapshot.forEach((doc) => {
        const medicationData = doc.data();
        if (!medicationData.endDate || medicationData.endDate.toDate() > new Date()) {
          medicationStats.active++;
        }
      });

      return {
        users: userStats,
        appointments: appointmentStats,
        medications: medicationStats,
        systemHealth: 'Good'
      };
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      throw error;
    }
  },

  // User Management
  getUsers: async (filters = {}) => {
    try {
      let usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
      
      if (filters.userType) {
        usersQuery = query(usersQuery, where('userType', '==', filters.userType));
      }
      
      if (filters.limit) {
        usersQuery = query(usersQuery, limit(filters.limit));
      }

      const usersSnapshot = await getDocs(usersQuery);
      const users = [];

      usersSnapshot.forEach((doc) => {
        users.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          lastActive: doc.data().lastActive?.toDate()
        });
      });

      return users;
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  updateUser: async (userId, updates) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        ...updates,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  deleteUser: async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting user:', error);
      throw error;
    }
  },

  // Appointments Management
  getAppointments: async (filters = {}) => {
    try {
      let appointmentsQuery = query(collection(db, 'appointments'), orderBy('dateTime', 'desc'));
      
      if (filters.status) {
        appointmentsQuery = query(appointmentsQuery, where('status', '==', filters.status));
      }
      
      if (filters.limit) {
        appointmentsQuery = query(appointmentsQuery, limit(filters.limit));
      }

      const appointmentsSnapshot = await getDocs(appointmentsQuery);
      const appointments = [];

      appointmentsSnapshot.forEach((doc) => {
        appointments.push({
          id: doc.id,
          ...doc.data(),
          dateTime: doc.data().dateTime?.toDate()
        });
      });

      return appointments;
    } catch (error) {
      console.error('Error fetching appointments:', error);
      throw error;
    }
  },

  updateAppointment: async (appointmentId, updates) => {
    try {
      const appointmentRef = doc(db, 'appointments', appointmentId);
      await updateDoc(appointmentRef, {
        ...updates,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating appointment:', error);
      throw error;
    }
  },

  // Medications Management
  getMedications: async (filters = {}) => {
    try {
      let medicationsQuery = query(collection(db, 'medications'), orderBy('startTime', 'desc'));
      
      if (filters.elderlyProfileId) {
        medicationsQuery = query(medicationsQuery, where('elderlyProfile', '==', filters.elderlyProfileId));
      }
      
      if (filters.limit) {
        medicationsQuery = query(medicationsQuery, limit(filters.limit));
      }

      const medicationsSnapshot = await getDocs(medicationsQuery);
      const medications = [];

      medicationsSnapshot.forEach((doc) => {
        medications.push({
          id: doc.id,
          ...doc.data(),
          startTime: doc.data().startTime?.toDate(),
          endDate: doc.data().endDate?.toDate()
        });
      });

      return medications;
    } catch (error) {
      console.error('Error fetching medications:', error);
      throw error;
    }
  },

  // Reports Generation
  generateReport: async (reportType, filters = {}) => {
    try {
      const reportData = {
        type: reportType,
        filters,
        generatedAt: new Date(),
        status: 'generating'
      };

      const reportRef = await addDoc(collection(db, 'reports'), reportData);
      
      // Simulate report generation
      setTimeout(async () => {
        await updateDoc(reportRef, {
          status: 'ready',
          data: await getReportData(reportType, filters)
        });
      }, 2000);

      return { id: reportRef.id, ...reportData };
    } catch (error) {
      console.error('Error generating report:', error);
      throw error;
    }
  },

  getReports: async () => {
    try {
      const reportsQuery = query(collection(db, 'reports'), orderBy('generatedAt', 'desc'));
      const reportsSnapshot = await getDocs(reportsQuery);
      const reports = [];

      reportsSnapshot.forEach((doc) => {
        reports.push({
          id: doc.id,
          ...doc.data(),
          generatedAt: doc.data().generatedAt?.toDate()
        });
      });

      return reports;
    } catch (error) {
      console.error('Error fetching reports:', error);
      throw error;
    }
  },

  // System Health
  getSystemHealth: async () => {
    try {
      // Check database connectivity
      const testQuery = query(collection(db, 'users'), limit(1));
      await getDocs(testQuery);
      
      return {
        database: 'Healthy',
        authentication: 'Healthy',
        notifications: 'Healthy',
        apiResponseTime: Math.floor(Math.random() * 50) + 20 // Mock response time
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        database: 'Unhealthy',
        authentication: 'Unknown',
        notifications: 'Unknown',
        apiResponseTime: 0
      };
    }
  }
};

// Helper function to get report data
const getReportData = async (reportType, filters) => {
  switch (reportType) {
    case 'user_activity':
      return await elderxAdminAPI.getUsers(filters);
    case 'appointments':
      return await elderxAdminAPI.getAppointments(filters);
    case 'medications':
      return await elderxAdminAPI.getMedications(filters);
    case 'system_health':
      return await elderxAdminAPI.getSystemHealth();
    default:
      return [];
  }
};
