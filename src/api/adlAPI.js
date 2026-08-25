import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot,
  serverTimestamp,
  getDocs,
  getDoc,
  limit as firestoreLimit
} from 'backend/database';
import { db } from '../backend/config';

class AdlAPI {
  // Get ADL logs for a client
  async getClientAdlLogs(clientId, limitCount = 50) {
    try {
      const logsQuery = query(
        collection(db, 'adlLogs'),
        where('clientId', '==', clientId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching ADL logs:', error);
      throw error;
    }
  }

  // Log an ADL activity
  async logActivity(logData) {
    try {
      const logEntry = {
        ...logData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'adlLogs'), logEntry);
      
      return {
        id: docRef.id,
        ...logEntry
      };
    } catch (error) {
      console.error('Error logging ADL activity:', error);
      throw error;
    }
  }

  // Get ADL logs for a specific date range
  async getAdlLogsByDateRange(clientId, startDate, endDate) {
    try {
      const logsQuery = query(
        collection(db, 'adlLogs'),
        where('clientId', '==', clientId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching ADL logs by date range:', error);
      throw error;
    }
  }

  // Get ADL statistics for a client
  async getClientAdlStats(clientId, days = 7) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - days);

      const logs = await this.getAdlLogsByDateRange(clientId, startDate, endDate);
      
      const stats = {
        totalLogged: logs.length,
        completed: logs.filter(log => log.status === 'completed').length,
        skipped: logs.filter(log => log.status === 'skipped').length,
        issues: logs.filter(log => log.status === 'issue').length,
        completionRate: 0,
        activities: {}
      };

      // Calculate completion rate
      if (stats.totalLogged > 0) {
        stats.completionRate = (stats.completed / stats.totalLogged) * 100;
      }

      // Group by activity
      logs.forEach(log => {
        if (!stats.activities[log.activityId]) {
          stats.activities[log.activityId] = {
            name: log.activityName,
            total: 0,
            completed: 0,
            skipped: 0,
            issues: 0
          };
        }
        
        stats.activities[log.activityId].total++;
        stats.activities[log.activityId][log.status]++;
      });

      return stats;
    } catch (error) {
      console.error('Error fetching ADL stats:', error);
      throw error;
    }
  }

  // Get ADL logs by caregiver
  async getCaregiverAdlLogs(caregiverId, limitCount = 50) {
    try {
      const logsQuery = query(
        collection(db, 'adlLogs'),
        where('caregiverId', '==', caregiverId),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limitCount)
      );

      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching caregiver ADL logs:', error);
      throw error;
    }
  }

  // Update an ADL log entry
  async updateAdlLog(logId, updateData) {
    try {
      const logRef = doc(db, 'adlLogs', logId);
      await updateDoc(logRef, {
        ...updateData,
        updatedAt: serverTimestamp()
      });

      return { success: true };
    } catch (error) {
      console.error('Error updating ADL log:', error);
      throw error;
    }
  }

  // Delete an ADL log entry
  async deleteAdlLog(logId) {
    try {
      const logRef = doc(db, 'adlLogs', logId);
      await deleteDoc(logRef);

      return { success: true };
    } catch (error) {
      console.error('Error deleting ADL log:', error);
      throw error;
    }
  }

  // Get ADL logs for reporting
  async getAdlLogsForReport(clientId, startDate, endDate, activityId = null) {
    try {
      let logsQuery = query(
        collection(db, 'adlLogs'),
        where('clientId', '==', clientId),
        where('timestamp', '>=', startDate),
        where('timestamp', '<=', endDate),
        orderBy('timestamp', 'desc')
      );

      if (activityId) {
        logsQuery = query(
          collection(db, 'adlLogs'),
          where('clientId', '==', clientId),
          where('activityId', '==', activityId),
          where('timestamp', '>=', startDate),
          where('timestamp', '<=', endDate),
          orderBy('timestamp', 'desc')
        );
      }

      const snapshot = await getDocs(logsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error fetching ADL logs for report:', error);
      throw error;
    }
  }

  // Subscribe to real-time ADL logs for a client
  subscribeToClientAdlLogs(clientId, callback) {
    const logsQuery = query(
      collection(db, 'adlLogs'),
      where('clientId', '==', clientId),
      orderBy('timestamp', 'desc'),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(logsQuery, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(logs);
    });
  }

  // Get all ADL activities (static list)
  getAllAdlActivities() {
    return [
      // Personal Care
      { id: 'bathing', name: 'Bathing/Tub, shower or partial', category: 'personal-care', icon: '🛁' },
      { id: 'bed-bath', name: 'Bed Bath', category: 'personal-care', icon: '🛏️' },
      { id: 'sponge-bath', name: 'Sponge Bath', category: 'personal-care', icon: '🧽' },
      { id: 'dressing', name: 'Dressing', category: 'personal-care', icon: '👕' },
      { id: 'grooming', name: 'Grooming', category: 'personal-care', icon: '💄' },
      { id: 'hair-care', name: 'Hair Care', category: 'personal-care', icon: '💇' },
      { id: 'oral-care', name: 'Oral Care', category: 'personal-care', icon: '🦷' },
      { id: 'nail-care', name: 'Nail Care', category: 'personal-care', icon: '💅' },
      { id: 'foot-care', name: 'Foot Care/Foot Soaks', category: 'personal-care', icon: '🦶' },
      { id: 'skin-care', name: 'Skin Care', category: 'personal-care', icon: '🧴' },
      { id: 'shampoo', name: 'Shampoo Hair', category: 'personal-care', icon: '🧴' },

      // Mobility & Transfers
      { id: 'ambulation', name: 'Ambulation', category: 'mobility', icon: '🚶' },
      { id: 'assist-walking', name: 'Assist with walking', category: 'mobility', icon: '🚶‍♂️' },
      { id: 'assist-exercise', name: 'Assist with exercise', category: 'mobility', icon: '🏃' },
      { id: 'transfer-gait', name: 'Transfer - Gait Belt', category: 'mobility', icon: '🦽' },
      { id: 'transfer-slide', name: 'Transfer - Slide Board', category: 'mobility', icon: '🛹' },
      { id: 'transferring', name: 'Transferring', category: 'mobility', icon: '🔄' },
      { id: 'hoyer-lift', name: 'Hoyer Lift Assist', category: 'mobility', icon: '🏋️' },
      { id: 'positioning', name: 'Positioning', category: 'mobility', icon: '🛌' },
      { id: 'turn-client', name: 'Turn Client', category: 'mobility', icon: '🔄' },
      { id: 'stand-by', name: 'Stand By Assist', category: 'mobility', icon: '🤝' },

      // Nutrition & Feeding
      { id: 'feeding', name: 'Feeding', category: 'nutrition', icon: '🍽️' },
      { id: 'assist-eating', name: 'Assist Eating', category: 'nutrition', icon: '🥄' },
      { id: 'meal-prep', name: 'Meal Preparation', category: 'nutrition', icon: '👨‍🍳' },
      { id: 'meal-planning', name: 'Meal Planning', category: 'nutrition', icon: '📋' },
      { id: 'special-diet', name: 'Special Diet Needs', category: 'nutrition', icon: '🥗' },
      { id: 'g-tube', name: 'Perform G-Tube feeding', category: 'nutrition', icon: '🏥' },
      { id: 'encourage-fluids', name: 'Encourage Fluids', category: 'nutrition', icon: '💧' },
      { id: 'restrict-fluids', name: 'Restrict Fluids', category: 'nutrition', icon: '🚫' },

      // Toileting & Incontinence
      { id: 'assist-commode', name: 'Assist to Commode', category: 'toileting', icon: '🚽' },
      { id: 'bedpan', name: 'Bedpan Assistance', category: 'toileting', icon: '🛏️' },
      { id: 'toileting', name: 'Toileting Assistance', category: 'toileting', icon: '🚽' },
      { id: 'incontinence', name: 'Incontinence Care', category: 'toileting', icon: '🩹' },
      { id: 'catheter', name: 'Catheter Care', category: 'toileting', icon: '🏥' },
      { id: 'bladder', name: 'Bladder Care', category: 'toileting', icon: '🩺' },
      { id: 'bowel', name: 'Bowel Care', category: 'toileting', icon: '🩺' },
      { id: 'peri-care', name: 'Peri Care', category: 'toileting', icon: '🧽' },

      // Medication & Health
      { id: 'med-reminders', name: 'Medication Reminders', category: 'medication', icon: '💊' },
      { id: 'med-setup', name: 'Med Set-Up', category: 'medication', icon: '📋' },
      { id: 'vital-signs', name: 'Vital Signs', category: 'medication', icon: '🩺' },
      { id: 'safety-care', name: 'Safety Care', category: 'medication', icon: '🛡️' },
      { id: 'fall-risk', name: 'Fall Risk', category: 'medication', icon: '⚠️' },
      { id: 'respiratory', name: 'Respiratory Care', category: 'medication', icon: '🫁' },
      { id: 'rom-exercises', name: 'Range of Motion Exercises', category: 'medication', icon: '🤸' },
      { id: 'physical-therapy', name: 'Basic Physical Therapy', category: 'medication', icon: '🏥' },
      { id: 'massage', name: 'Light Massage', category: 'medication', icon: '🤲' },

      // Household & Homemaking
      { id: 'light-housekeeping', name: 'Light Housekeeping', category: 'household', icon: '🏠' },
      { id: 'cleaning', name: 'Cleaning', category: 'household', icon: '🧹' },
      { id: 'dishwashing', name: 'Dishwashing', category: 'household', icon: '🍽️' },
      { id: 'laundry', name: 'Laundry', category: 'household', icon: '👕' },
      { id: 'ironing', name: 'Ironing', category: 'household', icon: '👔' },
      { id: 'make-bed', name: 'Make bed', category: 'household', icon: '🛏️' },
      { id: 'kitchen-cleanup', name: 'Kitchen Cleanup', category: 'household', icon: '🍳' },
      { id: 'bathroom-cleanup', name: 'Bathroom Cleanup', category: 'household', icon: '🚿' },
      { id: 'vacuuming', name: 'Vacuuming', category: 'household', icon: '🧹' },
      { id: 'sweeping', name: 'Sweeping', category: 'household', icon: '🧹' },
      { id: 'mopping', name: 'Mopping', category: 'household', icon: '🧽' },
      { id: 'dusting', name: 'Dusting', category: 'household', icon: '🪶' },
      { id: 'garbage', name: 'Dispose of garbage', category: 'household', icon: '🗑️' },

      // Transportation & Appointments
      { id: 'transportation', name: 'Client Transportation', category: 'transportation', icon: '🚗' },
      { id: 'appointments', name: 'Taking client to appointment', category: 'transportation', icon: '🏥' },
      { id: 'dr-appointment', name: 'Client Dr. Appointment', category: 'transportation', icon: '👨‍⚕️' },
      { id: 'errands', name: 'Client Errands', category: 'transportation', icon: '🛒' },

      // Social & Companionship
      { id: 'companionship', name: 'Companionship', category: 'social', icon: '👥' },
      { id: 'conversation', name: 'Conversation', category: 'social', icon: '💬' },
      { id: 'games', name: 'Games', category: 'social', icon: '🎮' },
      { id: 'walks', name: 'Taking Walks', category: 'social', icon: '🚶‍♀️' },
      { id: 'activity-out', name: 'Activity Out of Home', category: 'social', icon: '🏃‍♂️' },
      { id: 'respite', name: 'Respite', category: 'social', icon: '😌' },
      { id: 'well-being', name: 'Well Being Observation', category: 'social', icon: '👁️' },

      // Specialized Care
      { id: 'hospice', name: 'Hospice Care', category: 'specialized', icon: '🏥' },
      { id: 'homemaker', name: 'Homemaker', category: 'specialized', icon: '🏠' },
      { id: 'hygiene', name: 'Hygiene Assistance', category: 'specialized', icon: '🧼' },
      { id: 'plants', name: 'Watering Plants', category: 'specialized', icon: '🌱' },
      { id: 'pet-care', name: 'Pet Care', category: 'specialized', icon: '🐕' },
      { id: 'other', name: 'Other', category: 'specialized', icon: '📝' }
    ];
  }

  // Get ADL categories
  getAdlCategories() {
    return {
      'personal-care': 'Personal Care',
      'mobility': 'Mobility & Transfers',
      'nutrition': 'Nutrition & Feeding',
      'toileting': 'Toileting & Incontinence',
      'medication': 'Medication & Health',
      'household': 'Household & Homemaking',
      'transportation': 'Transportation & Appointments',
      'social': 'Social & Companionship',
      'specialized': 'Specialized Care'
    };
  }
}

const adlAPI = new AdlAPI();
export default adlAPI;
