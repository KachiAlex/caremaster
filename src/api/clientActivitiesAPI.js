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
  serverTimestamp,
  Timestamp
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
        createdAt: serverTimestamp(),
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
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
        });
      });

      return activities;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('clientId', '==', clientId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const results = [];
        fallbackSnapshot.forEach((doc) => {
          results.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
          });
        });
        results.sort((a, b) => {
          const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
        });
        return results.slice(0, limitCount);
      }
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
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
        });
      });

      return activities;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('performedBy', '==', performerId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const results = [];
        fallbackSnapshot.forEach((doc) => {
          results.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
          });
        });
        results.sort((a, b) => {
          const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
        });
        return results.slice(0, limitCount);
      }
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
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
          timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
        });
      });

      return activities;
    } catch (error) {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        let fallbackQuery;
        if (institutionId) {
          fallbackQuery = query(
            collection(db, CLIENT_ACTIVITIES_COLLECTION),
            where('activityType', '==', activityType),
            where('institutionId', '==', institutionId)
          );
        } else {
          fallbackQuery = query(
            collection(db, CLIENT_ACTIVITIES_COLLECTION),
            where('activityType', '==', activityType)
          );
        }
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const results = [];
        fallbackSnapshot.forEach((doc) => {
          results.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt),
            timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : doc.data().timestamp,
          });
        });
        results.sort((a, b) => {
          const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
        });
        return results.slice(0, limitCount);
      }
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
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('institutionId', '==', institutionId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const results = [];
        fallbackSnapshot.forEach((doc) => {
          results.push({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
          });
        });
        results.sort((a, b) => {
          const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
          const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
          return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
        });
        return results.slice(0, limitCount);
      }
      console.error('Error fetching recent activities:', error);
      throw error;
    }
  },

  // Subscribe to client activities for real-time updates
  subscribeToClientActivities: (clientId, callback) => {
    let unsubscribeFallback = null;
    const activitiesQuery = query(
      collection(db, CLIENT_ACTIVITIES_COLLECTION),
      where('clientId', '==', clientId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (querySnapshot) => {
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      callback(activities);
    }, (error) => {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback subscription:', error.message);
        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('clientId', '==', clientId)
        );
        unsubscribeFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
          const activities = [];
          querySnapshot.forEach((doc) => {
            activities.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
            });
          });
          activities.sort((a, b) => {
            const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
          });
          callback(activities.slice(0, 50));
        });
      } else {
        console.error('Error in client activities subscription:', error);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  },

  // Subscribe to recent activities for admin dashboard
  subscribeToRecentActivities: (institutionId, callback) => {
    let unsubscribeFallback = null;
    const activitiesQuery = query(
      collection(db, CLIENT_ACTIVITIES_COLLECTION),
      where('institutionId', '==', institutionId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsubscribe = onSnapshot(activitiesQuery, (querySnapshot) => {
      const activities = [];
      querySnapshot.forEach((doc) => {
        activities.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
        });
      });
      callback(activities);
    }, (error) => {
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback subscription:', error.message);
        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('institutionId', '==', institutionId)
        );
        unsubscribeFallback = onSnapshot(fallbackQuery, (querySnapshot) => {
          const activities = [];
          querySnapshot.forEach((doc) => {
            activities.push({
              id: doc.id,
              ...doc.data(),
              createdAt: doc.data().createdAt?.toDate?.() || new Date(doc.data().createdAt)
            });
          });
          activities.sort((a, b) => {
            const av = a.createdAt?.getTime ? a.createdAt.getTime() : new Date(a.createdAt).getTime();
            const bv = b.createdAt?.getTime ? b.createdAt.getTime() : new Date(b.createdAt).getTime();
            return (isNaN(bv) ? 0 : bv) - (isNaN(av) ? 0 : av); // desc
          });
          callback(activities.slice(0, 20));
        });
      } else {
        console.error('Error in recent activities subscription:', error);
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeFallback) unsubscribeFallback();
    };
  },

  // Get activity statistics
  getActivityStats: async (institutionId, dateRange = 7) => {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - dateRange);

      const activitiesQuery = query(
        collection(db, CLIENT_ACTIVITIES_COLLECTION),
        where('institutionId', '==', institutionId),
        where('createdAt', '>=', Timestamp.fromDate(startDate))
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
      if (error.code === 'failed-precondition' || error.message?.includes('index') || error.message?.includes('query requires an index')) {
        console.warn('Index missing, using fallback query:', error.message);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - dateRange);
        const startDateTimestamp = Timestamp.fromDate(startDate);

        const fallbackQuery = query(
          collection(db, CLIENT_ACTIVITIES_COLLECTION),
          where('institutionId', '==', institutionId)
        );
        const fallbackSnapshot = await getDocs(fallbackQuery);
        const stats = {
          total: 0,
          byType: {},
          byPerformer: {},
          byDate: {}
        };

        fallbackSnapshot.forEach((doc) => {
          const data = doc.data();
          const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
          // Filter by date range in memory
          if (createdAt < startDate) return;

          stats.total++;
          const activityType = data.activityType || 'unknown';
          const performerRole = data.performerRole || 'unknown';
          const date = createdAt.toDateString();

          // Count by type
          stats.byType[activityType] = (stats.byType[activityType] || 0) + 1;

          // Count by performer role
          stats.byPerformer[performerRole] = (stats.byPerformer[performerRole] || 0) + 1;

          // Count by date
          stats.byDate[date] = (stats.byDate[date] || 0) + 1;
        });

        return stats;
      }
      console.error('Error fetching activity stats:', error);
      throw error;
    }
  }
};

export default clientActivitiesAPI;