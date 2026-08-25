import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp
} from 'backend/database';
import { db } from '../backend/config';

const CLIENT_ACTIVITIES_COLLECTION = 'clientActivities';

// Legacy function name for backward compatibility
export const logClientActivity = async (activityData) => {
  return await clientActivitiesAPI.logActivity(activityData);
};

export const clientActivitiesAPI = {
  // Log activity to client's database
  logActivity: async (activityData) => {
    try {
      const activityRecord = {
        ...activityData,
        timestamp: serverTimestamp(),
        createdAt: new Date().toISOString(),
        institutionId: activityData.institutionId || null
      };

      const docRef = await addDoc(collection(db, CLIENT_ACTIVITIES_COLLECTION), activityRecord);
      console.log('✅ Activity logged:', activityData.activityType, 'for client:', activityData.clientId);
      return { id: docRef.id, ...activityRecord };
    } catch (error) {
      console.error('❌ Error logging activity:', error);
      throw error;
    }
  },

  // Get activities for a specific client
  getClientActivities: async (clientId, limitCount = 100) => {
    try {
      const activitiesQuery = query(
        collection(db, CLIENT_ACTIVITIES_COLLECTION),
        where('clientId', '==', clientId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching client activities:', error);
      throw error;
    }
  },

  // Get activities by performer (caregiver, doctor, pharmacist, nurse)
  getActivitiesByPerformer: async (performerId, limitCount = 50) => {
    try {
      const activitiesQuery = query(
        collection(db, CLIENT_ACTIVITIES_COLLECTION),
        where('performedBy', '==', performerId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching activities by performer:', error);
      throw error;
    }
  },

  // Get activities by type
  getActivitiesByType: async (activityType, institutionId = null, limitCount = 50) => {
    try {
      let activitiesQuery;
      
      if (institutionId) {
        activitiesQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('activityType', '==', activityType),
          where('institutionId', '==', institutionId),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      } else {
        activitiesQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('activityType', '==', activityType),
          orderBy('createdAt', 'desc'),
          limit(limitCount)
        );
      }

      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching activities by type:', error);
      throw error;
    }
  },

  // Get recent activities for admin dashboard
  getRecentActivities: async (institutionId, limitCount = 20) => {
    try {
      const activitiesQuery = query(
        collection(db, CLIENT_ACTIVITIES_COLLECTION),
        where('institutionId', '==', institutionId),
        orderBy('createdAt', 'desc'),
        limit(limitCount)
      );

      const querySnapshot = await getDocs(activitiesQuery);
      const activities = [];

      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });

      return activities;
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  // Subscribe to client activities for real-time updates
  subscribeToClientActivities: (clientId, callback) => {
    const activitiesQuery = query(
      collection(db, CLIENT_ACTIVITIES_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    return onSnapshot(activitiesQuery, (querySnapshot) => {
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      callback(activities);
    });
  },

  // Subscribe to recent activities for admin dashboard
  subscribeToRecentActivities: (institutionId, callback) => {
    const activitiesQuery = query(
      collection(db, CLIENT_ACTIVITIES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    return onSnapshot(activitiesQuery, (querySnapshot) => {
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      callback(activities);
    });
  },

  // Get activity statistics
  getActivityStats: async (institutionId, dateRange = 7) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const activitiesQuery = query(
        collection(db, CLIENT_ACTIVITIES_COLLECTION),
        where('institutionId', '==', institutionId),
        where('createdAt', '>=', startDate)
      );

      const querySnapshot = await getDocs(activitiesQuery);
      const stats = {
        total: querySnapshot.size,
        byType: {},
        byPerformer: {},
        byDate: {}
      };

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const activityType = data.activityType || 'unknown';
        const performerRole = data.performerRole || 'unknown';
        const date = data.createdAt?.toDate?.()?.toDateString() || new Date(data.createdAt).toDateString();

        // Count by type
        stats.byType[activityType] = (stats.byType[activityType] || 0) + 1;

        // Count by performer role
        stats.byPerformer[performerRole] = (stats.byPerformer[performerRole] || 0) + 1;

        // Count by date
        stats.byDate[date] = (stats.byDate[date] || 0) + 1;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
};

export default clientActivitiesAPI;