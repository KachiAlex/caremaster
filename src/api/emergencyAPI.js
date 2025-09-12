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
  serverTimestamp
} from 'firebase/firestore';

export const emergencyAPI = {
  // Real-time Emergency Monitoring
  subscribeToEmergencies: (callback) => {
    const emergenciesQuery = query(
      collection(db, 'emergencies'),
      orderBy('triggeredAt', 'desc')
    );
    
    return onSnapshot(emergenciesQuery, (snapshot) => {
      const emergencies = [];
      snapshot.forEach((doc) => {
        emergencies.push({
          id: doc.id,
          ...doc.data(),
          triggeredAt: doc.data().triggeredAt?.toDate(),
          resolvedAt: doc.data().resolvedAt?.toDate()
        });
      });
      callback(emergencies);
    });
  },

  // Get Emergency Statistics
  getEmergencyStats: async () => {
    try {
      const emergenciesQuery = query(collection(db, 'emergencies'));
      const emergenciesSnapshot = await getDocs(emergenciesQuery);
      
      const stats = {
        total: 0,
        active: 0,
        resolved: 0,
        critical: 0,
        averageResponseTime: 0
      };

      let totalResponseTime = 0;
      let resolvedCount = 0;

      emergenciesSnapshot.forEach((doc) => {
        const emergency = doc.data();
        stats.total++;
        
        if (emergency.status === 'active') stats.active++;
        if (emergency.status === 'resolved') {
          stats.resolved++;
          if (emergency.responseTime) {
            totalResponseTime += emergency.responseTime;
            resolvedCount++;
          }
        }
        if (emergency.severity === 'Critical') stats.critical++;
      });

      stats.averageResponseTime = resolvedCount > 0 ? Math.round(totalResponseTime / resolvedCount) : 0;
      
      return stats;
    } catch (error) {
      console.error('Error fetching emergency stats:', error);
      throw error;
    }
  },

  // Create Emergency Alert
  createEmergency: async (emergencyData) => {
    try {
      const emergencyRef = await addDoc(collection(db, 'emergencies'), {
        ...emergencyData,
        status: 'active',
        triggeredAt: serverTimestamp(),
        responseTime: 0,
        actions: []
      });
      return { id: emergencyRef.id, success: true };
    } catch (error) {
      console.error('Error creating emergency:', error);
      throw error;
    }
  },

  // Update Emergency Status
  updateEmergencyStatus: async (emergencyId, status, additionalData = {}) => {
    try {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      const updateData = {
        status,
        updatedAt: serverTimestamp(),
        ...additionalData
      };

      if (status === 'resolved') {
        updateData.resolvedAt = serverTimestamp();
      }

      await updateDoc(emergencyRef, updateData);
      return { success: true };
    } catch (error) {
      console.error('Error updating emergency status:', error);
      throw error;
    }
  },

  // Add Emergency Action
  addEmergencyAction: async (emergencyId, action) => {
    try {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      const emergencyDoc = await getDoc(emergencyRef);
      
      if (emergencyDoc.exists()) {
        const currentActions = emergencyDoc.data().actions || [];
        const newAction = {
          ...action,
          timestamp: serverTimestamp(),
          id: Date.now().toString()
        };
        
        await updateDoc(emergencyRef, {
          actions: [...currentActions, newAction],
          updatedAt: serverTimestamp()
        });
        
        return { success: true };
      }
      
      throw new Error('Emergency not found');
    } catch (error) {
      console.error('Error adding emergency action:', error);
      throw error;
    }
  },

  // Get Emergency Protocols
  getEmergencyProtocols: async () => {
    try {
      const protocolsQuery = query(
        collection(db, 'emergencyProtocols'),
        where('isActive', '==', true),
        orderBy('name', 'asc')
      );
      
      const protocolsSnapshot = await getDocs(protocolsQuery);
      const protocols = [];

      protocolsSnapshot.forEach((doc) => {
        protocols.push({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return protocols;
    } catch (error) {
      console.error('Error fetching emergency protocols:', error);
      throw error;
    }
  },

  // Create Emergency Protocol
  createEmergencyProtocol: async (protocolData) => {
    try {
      const protocolRef = await addDoc(collection(db, 'emergencyProtocols'), {
        ...protocolData,
        isActive: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: protocolRef.id, success: true };
    } catch (error) {
      console.error('Error creating emergency protocol:', error);
      throw error;
    }
  },

  // Update Emergency Protocol
  updateEmergencyProtocol: async (protocolId, protocolData) => {
    try {
      const protocolRef = doc(db, 'emergencyProtocols', protocolId);
      await updateDoc(protocolRef, {
        ...protocolData,
        updatedAt: serverTimestamp()
      });
      return { success: true };
    } catch (error) {
      console.error('Error updating emergency protocol:', error);
      throw error;
    }
  },

  // Delete Emergency Protocol
  deleteEmergencyProtocol: async (protocolId) => {
    try {
      const protocolRef = doc(db, 'emergencyProtocols', protocolId);
      await deleteDoc(protocolRef);
      return { success: true };
    } catch (error) {
      console.error('Error deleting emergency protocol:', error);
      throw error;
    }
  },

  // Get Emergency History
  getEmergencyHistory: async (filters = {}) => {
    try {
      let emergenciesQuery = query(
        collection(db, 'emergencies'),
        orderBy('triggeredAt', 'desc')
      );

      if (filters.status) {
        emergenciesQuery = query(emergenciesQuery, where('status', '==', filters.status));
      }

      if (filters.severity) {
        emergenciesQuery = query(emergenciesQuery, where('severity', '==', filters.severity));
      }

      if (filters.limit) {
        emergenciesQuery = query(emergenciesQuery, limit(filters.limit));
      }

      const emergenciesSnapshot = await getDocs(emergenciesQuery);
      const emergencies = [];

      emergenciesSnapshot.forEach((doc) => {
        emergencies.push({
          id: doc.id,
          ...doc.data(),
          triggeredAt: doc.data().triggeredAt?.toDate(),
          resolvedAt: doc.data().resolvedAt?.toDate()
        });
      });

      return emergencies;
    } catch (error) {
      console.error('Error fetching emergency history:', error);
      throw error;
    }
  },

  // Send Emergency Notification
  sendEmergencyNotification: async (emergencyId, notificationData) => {
    try {
      // This would integrate with your notification service
      // For now, we'll just log the notification
      console.log('Sending emergency notification:', {
        emergencyId,
        ...notificationData
      });

      // Add notification action to emergency
      await emergencyAPI.addEmergencyAction(emergencyId, {
        action: 'Notification sent',
        description: `Notification sent to ${notificationData.recipients.join(', ')}`,
        performedBy: 'System'
      });

      return { success: true };
    } catch (error) {
      console.error('Error sending emergency notification:', error);
      throw error;
    }
  },

  // Get Emergency Analytics
  getEmergencyAnalytics: async (dateRange = {}) => {
    try {
      const emergenciesQuery = query(collection(db, 'emergencies'));
      const emergenciesSnapshot = await getDocs(emergenciesQuery);
      
      const analytics = {
        totalEmergencies: 0,
        emergenciesByType: {},
        emergenciesBySeverity: {},
        responseTimeDistribution: [],
        monthlyTrends: {},
        topEmergencyTypes: []
      };

      emergenciesSnapshot.forEach((doc) => {
        const emergency = doc.data();
        analytics.totalEmergencies++;

        // Count by type
        const type = emergency.emergencyType || 'Unknown';
        analytics.emergenciesByType[type] = (analytics.emergenciesByType[type] || 0) + 1;

        // Count by severity
        const severity = emergency.severity || 'Unknown';
        analytics.emergenciesBySeverity[severity] = (analytics.emergenciesBySeverity[severity] || 0) + 1;

        // Response time distribution
        if (emergency.responseTime) {
          analytics.responseTimeDistribution.push(emergency.responseTime);
        }
      });

      // Calculate top emergency types
      analytics.topEmergencyTypes = Object.entries(analytics.emergenciesByType)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      return analytics;
    } catch (error) {
      console.error('Error fetching emergency analytics:', error);
      throw error;
    }
  }
};
