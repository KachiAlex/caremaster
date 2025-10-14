import { 
  collection, 
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  updateDoc, 
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';

const ACTIVITIES_COLLECTION = 'caregiverActivities';

// Activity categories
export const ACTIVITY_CATEGORIES = {
  PERSONAL_CARE: 'Personal Care',
  MEDICAL_CARE: 'Medical Care',
  MOBILITY: 'Mobility Assistance',
  NUTRITION: 'Nutrition & Meals',
  SOCIAL: 'Social Activities',
  HOUSEKEEPING: 'Housekeeping',
  MEDICATION: 'Medication Management',
  VITAL_SIGNS: 'Vital Signs Monitoring',
  THERAPY: 'Therapy & Exercises',
  DOCUMENTATION: 'Documentation',
  OTHER: 'Other'
};

// Common activities
export const COMMON_ACTIVITIES = {
  [ACTIVITY_CATEGORIES.PERSONAL_CARE]: [
    'Bathing Assistance',
    'Grooming',
    'Dressing',
    'Oral Care',
    'Toileting Assistance',
    'Skin Care'
  ],
  [ACTIVITY_CATEGORIES.MEDICAL_CARE]: [
    'Wound Care',
    'Catheter Care',
    'Oxygen Therapy',
    'Blood Sugar Check',
    'Injection Administration',
    'Medical Equipment Check'
  ],
  [ACTIVITY_CATEGORIES.MOBILITY]: [
    'Transfer Assistance',
    'Walking Assistance',
    'Wheelchair Transfer',
    'Positioning',
    'Range of Motion Exercises',
    'Fall Prevention'
  ],
  [ACTIVITY_CATEGORIES.NUTRITION]: [
    'Meal Preparation',
    'Feeding Assistance',
    'Hydration Monitoring',
    'Dietary Restriction Compliance',
    'Nutrition Documentation',
    'Snack Provision'
  ],
  [ACTIVITY_CATEGORIES.SOCIAL]: [
    'Conversation & Companionship',
    'Reading Together',
    'Games & Entertainment',
    'Outdoor Activity',
    'Family Visit Facilitation',
    'Community Engagement'
  ],
  [ACTIVITY_CATEGORIES.HOUSEKEEPING]: [
    'Light Cleaning',
    'Laundry',
    'Bed Making',
    'Organizing Personal Space',
    'Trash Removal',
    'Safety Check'
  ],
  [ACTIVITY_CATEGORIES.MEDICATION]: [
    'Medication Administration',
    'Medication Reminder',
    'Medication Pickup',
    'Medication Reconciliation',
    'Side Effect Monitoring'
  ],
  [ACTIVITY_CATEGORIES.VITAL_SIGNS]: [
    'Blood Pressure Check',
    'Temperature Check',
    'Heart Rate Monitoring',
    'Weight Measurement',
    'Oxygen Saturation Check',
    'Pain Assessment'
  ]
};

// Log an activity
export const logActivity = async (activityData) => {
  try {
    if (!activityData.caregiverId || !activityData.clientId) {
      throw new Error('Caregiver ID and Client ID are required');
    }

    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    const newActivity = {
      caregiverId: activityData.caregiverId,
      caregiverName: activityData.caregiverName || '',
      clientId: activityData.clientId,
      clientName: activityData.clientName || '',
      institutionId: activityData.institutionId || '',
      category: activityData.category || ACTIVITY_CATEGORIES.OTHER,
      activityType: activityData.activityType || '',
      description: activityData.description || '',
      notes: activityData.notes || '',
      duration: activityData.duration || 0, // in minutes
      startTime: activityData.startTime || new Date().toISOString(),
      endTime: activityData.endTime || new Date().toISOString(),
      status: activityData.status || 'completed',
      qualityRating: activityData.qualityRating || null,
      images: activityData.images || [],
      location: activityData.location || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const docRef = await addDoc(activitiesRef, newActivity);
    console.log('✅ Activity logged with ID:', docRef.id);
    return { id: docRef.id, ...newActivity };
  } catch (error) {
    console.error('Error logging activity:', error);
    throw error;
  }
};

// Get activities by caregiver
export const getActivitiesByCaregiver = async (caregiverId, limitCount = 50) => {
  try {
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    // Use simple query without orderBy to avoid index requirement
    // We'll sort client-side instead
    const q = query(
      activitiesRef,
      where('caregiverId', '==', caregiverId)
    );

    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
        startTime: data.startTime || data.createdAt,
        endTime: data.endTime || data.createdAt
      });
    });

    // Sort client-side by createdAt descending
    activities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA; // Descending order (newest first)
    });

    // Apply limit client-side
    const limitedActivities = activities.slice(0, limitCount);
    
    console.log(`📊 Loaded ${limitedActivities.length} activities (sorted client-side)`);
    return limitedActivities;
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
  }
};

// Get activities by client
export const getActivitiesByClient = async (clientId, limitCount = 50) => {
  try {
    const activitiesRef = collection(db, ACTIVITIES_COLLECTION);
    // Use simple query without orderBy to avoid index requirement
    const q = query(
      activitiesRef,
      where('clientId', '==', clientId)
    );

    const querySnapshot = await getDocs(q);
    const activities = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      activities.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt)
      });
    });

    // Sort client-side by createdAt descending
    activities.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return dateB - dateA;
    });

    // Apply limit client-side
    return activities.slice(0, limitCount);
  } catch (error) {
    console.error('Error fetching activities by client:', error);
    return [];
  }
};

// Get activities for today
export const getTodayActivities = async (caregiverId) => {
  try {
    // Use simple query first, filter client-side to avoid index requirements
    const allActivities = await getActivitiesByCaregiver(caregiverId, 200);
    const today = new Date().toDateString();
    const todayActivities = allActivities.filter(a => {
      const activityDate = new Date(a.createdAt).toDateString();
      return activityDate === today;
    });
    
    console.log(`📅 Today's activities: ${todayActivities.length} out of ${allActivities.length} total`);
    return todayActivities;
  } catch (error) {
    console.error('Error fetching today activities:', error);
    return [];
  }
};

// Get activity statistics
export const getActivityStats = async (caregiverId, startDate, endDate) => {
  try {
    // Fetch all activities for the caregiver, then filter client-side
    // This avoids complex index requirements while indexes are building
    const allActivities = await getActivitiesByCaregiver(caregiverId, 500);
    
    let activities = allActivities;
    
    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate).getTime();
      const end = new Date(endDate).getTime();
      
      activities = allActivities.filter(a => {
        const activityTime = new Date(a.createdAt).getTime();
        return activityTime >= start && activityTime <= end;
      });
    }

    // Calculate statistics
    const stats = {
      totalActivities: activities.length,
      totalDuration: activities.reduce((sum, a) => sum + (a.duration || 0), 0),
      byCategory: {},
      uniqueClients: new Set(activities.map(a => a.clientId)).size,
      averageQuality: 0,
      completedActivities: activities.filter(a => a.status === 'completed').length
    };

    // Group by category
    Object.values(ACTIVITY_CATEGORIES).forEach(category => {
      stats.byCategory[category] = activities.filter(a => a.category === category).length;
    });

    // Calculate average quality rating
    const ratedActivities = activities.filter(a => a.qualityRating);
    if (ratedActivities.length > 0) {
      stats.averageQuality = ratedActivities.reduce((sum, a) => sum + a.qualityRating, 0) / ratedActivities.length;
    }

    console.log(`📊 Stats calculated: ${activities.length} activities in date range`);
    return stats;
  } catch (error) {
    console.error('Error fetching activity stats:', error);
    return {
      totalActivities: 0,
      totalDuration: 0,
      byCategory: {},
      uniqueClients: 0,
      averageQuality: 0,
      completedActivities: 0
    };
  }
};

// Update activity
export const updateActivity = async (activityId, updates) => {
  try {
    const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await updateDoc(activityRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// Delete activity
export const deleteActivity = async (activityId) => {
  try {
    const activityRef = doc(db, ACTIVITIES_COLLECTION, activityId);
    await deleteDoc(activityRef);
    return true;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

// Get weekly summary
export const getWeeklySummary = async (caregiverId) => {
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay()); // Start of week (Sunday)
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  return await getActivityStats(caregiverId, weekStart, weekEnd);
};

// Get monthly summary
export const getMonthlySummary = async (caregiverId) => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  return await getActivityStats(caregiverId, monthStart, monthEnd);
};

export default {
  logActivity,
  getActivitiesByCaregiver,
  getActivitiesByClient,
  getTodayActivities,
  getActivityStats,
  updateActivity,
  deleteActivity,
  getWeeklySummary,
  getMonthlySummary,
  ACTIVITY_CATEGORIES,
  COMMON_ACTIVITIES
};

