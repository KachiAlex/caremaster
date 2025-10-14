import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const CLIENT_ACTIVITIES_COLLECTION = 'clientActivities';

/**
 * Log an activity for a client
 * @param {Object} activityData - Activity data
 * @param {string} activityData.clientId - Client ID
 * @param {string} activityData.activityType - Type: consultation, prescription, care_log, diagnostic, task, etc.
 * @param {string} activityData.performedBy - UID of person who performed the activity
 * @param {string} activityData.performerName - Name of performer
 * @param {string} activityData.performerRole - Role: doctor, nurse, caregiver, pharmacist
 * @param {string} activityData.description - Human-readable description
 * @param {Object} activityData.details - Additional details specific to activity type
 * @param {string} activityData.institutionId - Institution ID
 */
export const logClientActivity = async (activityData) => {
  try {
    if (!activityData.clientId || !activityData.activityType) {
      throw new Error('Client ID and activity type are required');
    }

    const activitiesRef = collection(db, CLIENT_ACTIVITIES_COLLECTION);
    const newActivity = {
      clientId: activityData.clientId,
      activityType: activityData.activityType,
      performedBy: activityData.performedBy || '',
      performerName: activityData.performerName || '',
      performerRole: activityData.performerRole || '',
      description: activityData.description || '',
      details: activityData.details || {},
      institutionId: activityData.institutionId || '',
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(activitiesRef, newActivity);
    console.log('✅ Client activity logged:', docRef.id);
    
    return { id: docRef.id, ...newActivity };
  } catch (error) {
    console.error('Error logging client activity:', error);
    throw error;
  }
};

/**
 * Get all activities for a client
 * @param {string} clientId - Client ID
 * @param {number} limitCount - Maximum number of activities to return
 */
export const getClientActivities = async (clientId, limitCount = 100) => {
  try {
    const activitiesRef = collection(db, CLIENT_ACTIVITIES_COLLECTION);
    const q = query(
      activitiesRef,
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp),
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      });
    });

    return activities;
  } catch (error) {
    console.error('Error fetching client activities:', error);
    return [];
  }
};

/**
 * Get activities by type for a client
 * @param {string} clientId - Client ID
 * @param {string} activityType - Activity type to filter
 * @param {number} limitCount - Maximum number of activities to return
 */
export const getClientActivitiesByType = async (clientId, activityType, limitCount = 50) => {
  try {
    const activitiesRef = collection(db, CLIENT_ACTIVITIES_COLLECTION);
    const q = query(
      activitiesRef,
      where('clientId', '==', clientId),
      where('activityType', '==', activityType),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      });
    });

    return activities;
  } catch (error) {
    console.error('Error fetching client activities by type:', error);
    return [];
  }
};

/**
 * Get recent activities for an institution
 * @param {string} institutionId - Institution ID
 * @param {number} limitCount - Maximum number of activities to return
 */
export const getInstitutionActivities = async (institutionId, limitCount = 50) => {
  try {
    const activitiesRef = collection(db, CLIENT_ACTIVITIES_COLLECTION);
    const q = query(
      activitiesRef,
      where('institutionId', '==', institutionId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || new Date(data.timestamp)
      });
    });

    return activities;
  } catch (error) {
    console.error('Error fetching institution activities:', error);
    return [];
  }
};

/**
 * Get activity summary for a client
 * @param {string} clientId - Client ID
 */
export const getClientActivitySummary = async (clientId) => {
  try {
    const activities = await getClientActivities(clientId);
    
    const summary = {
      total: activities.length,
      byType: {},
      byPerformer: {},
      recent: activities.slice(0, 10)
    };

    activities.forEach(activity => {
      // Count by type
      summary.byType[activity.activityType] = (summary.byType[activity.activityType] || 0) + 1;
      
      // Count by performer
      if (activity.performedBy) {
        summary.byPerformer[activity.performedBy] = (summary.byPerformer[activity.performedBy] || 0) + 1;
      }
    });

    return summary;
  } catch (error) {
    console.error('Error getting client activity summary:', error);
    return { total: 0, byType: {}, byPerformer: {}, recent: [] };
  }
};

export default {
  logClientActivity,
  getClientActivities,
  getClientActivitiesByType,
  getInstitutionActivities,
  getClientActivitySummary
};

