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
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase/config';

class CallService {
  constructor() {
    this.activeCall = null;
    this.callListeners = new Map();
  }

  // Generate unique call ID
  generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Initiate a call
  async initiateCall(callerId, recipientId, callType = 'video') {
    try {
      console.log('🔥 CallService.initiateCall called:', { callerId, recipientId, callType });
      
      // Validation
      if (!callerId || !recipientId) {
        throw new Error('Caller ID and Recipient ID are required');
      }
      
      if (callerId === recipientId) {
        throw new Error('Cannot call yourself');
      }
      
      const callId = this.generateCallId();
      const callData = {
        callId,
        callerId,
        recipientId,
        callType,
        status: 'initiating',
        createdAt: serverTimestamp(),
        answeredAt: null,
        endedAt: null,
        duration: 0
      };

      // Create call document
      console.log('📄 Creating call document in Firestore...');
      const callDoc = await addDoc(collection(db, 'calls'), callData);
      console.log('✅ Call document created:', callDoc.id);

      // Send call notification
      console.log('🔔 Sending call notification to recipient:', recipientId);
      await this.sendCallNotification(recipientId, {
        callId,
        callerId,
        callType,
        status: 'incoming'
      });
      console.log('✅ Call notification sent successfully');

      this.activeCall = { ...callData, id: callDoc.id };

      return { success: true, callId, callData: this.activeCall };
    } catch (error) {
      console.error('❌ Error initiating call:', error);
      return { success: false, error: error.message };
    }
  }

  // Answer a call
  async answerCall(callId, recipientId) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('callId', '==', callId)
      );

      const snapshot = await getDocs(callsQuery);
      if (snapshot.empty) {
        throw new Error('Call not found');
      }

      const callDoc = snapshot.docs[0];
      await updateDoc(callDoc.ref, {
        status: 'answered',
        answeredAt: serverTimestamp()
      });

      // Update the original incoming call notification to answered
      const notificationsQuery = query(
        collection(db, 'callNotifications'),
        where('callId', '==', callId),
        where('userId', '==', recipientId),
        where('status', '==', 'incoming')
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const updatePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'answered',
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(updatePromises);
      console.log(`✅ Updated ${notificationsSnapshot.size} call notifications to answered`);

      // Send answer notification to caller
      await this.sendCallNotification(callDoc.data().callerId, {
        callId,
        recipientId,
        status: 'answered'
      });

      return { success: true };
    } catch (error) {
      console.error('Error answering call:', error);
      return { success: false, error: error.message };
    }
  }

  // Reject a call
  async rejectCall(callId, recipientId) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('callId', '==', callId)
      );

      const snapshot = await getDocs(callsQuery);
      if (snapshot.empty) {
        throw new Error('Call not found');
      }

      const callDoc = snapshot.docs[0];
      await updateDoc(callDoc.ref, {
        status: 'rejected',
        endedAt: serverTimestamp()
      });

      // Update the original incoming call notification to rejected
      const notificationsQuery = query(
        collection(db, 'callNotifications'),
        where('callId', '==', callId),
        where('userId', '==', recipientId),
        where('status', '==', 'incoming')
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const updatePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'rejected',
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(updatePromises);
      console.log(`✅ Updated ${notificationsSnapshot.size} call notifications to rejected`);

      // Send rejection notification to caller
      await this.sendCallNotification(callDoc.data().callerId, {
        callId,
        recipientId,
        status: 'rejected'
      });

      return { success: true };
    } catch (error) {
      console.error('Error rejecting call:', error);
      return { success: false, error: error.message };
    }
  }

  // End a call
  async endCall(callId, duration = 0) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('callId', '==', callId)
      );

      const snapshot = await getDocs(callsQuery);
      if (snapshot.empty) {
        throw new Error('Call not found');
      }

      const callDoc = snapshot.docs[0];
      const callData = callDoc.data();
      
      await updateDoc(callDoc.ref, {
        status: 'ended',
        endedAt: serverTimestamp(),
        duration: duration
      });

      // Update all call notifications for this call to ended
      const notificationsQuery = query(
        collection(db, 'callNotifications'),
        where('callId', '==', callId),
        where('status', '==', 'incoming')
      );
      
      const notificationsSnapshot = await getDocs(notificationsQuery);
      const updatePromises = notificationsSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          status: 'ended',
          updatedAt: serverTimestamp()
        })
      );
      await Promise.all(updatePromises);
      console.log(`✅ Updated ${notificationsSnapshot.size} call notifications to ended`);

      // Clean up active call
      if (this.activeCall && this.activeCall.callId === callId) {
        this.activeCall = null;
      }

      return { success: true };
    } catch (error) {
      console.error('Error ending call:', error);
      return { success: false, error: error.message };
    }
  }

  // Send call notification
  async sendCallNotification(userId, notificationData) {
    try {
      console.log('📨 sendCallNotification called:', { userId, notificationData });
      
      // Only send to callNotifications collection for now to avoid permission issues
      const notificationDoc = await addDoc(collection(db, 'callNotifications'), {
        userId,
        ...notificationData,
        timestamp: serverTimestamp()
      });
      
      console.log('✅ Notification document created:', {
        notificationId: notificationDoc.id,
        userId,
        callId: notificationData.callId,
        status: notificationData.status
      });
    } catch (error) {
      console.error('❌ Error sending call notification:', error);
      throw error; // Re-throw to let caller know it failed
    }
  }

  // Listen for incoming calls
  listenForIncomingCalls(userId, onIncomingCall) {
    const notificationsQuery = query(
      collection(db, 'callNotifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = change.doc.data();
          
          // Only show incoming calls that are:
          // 1. Status is 'incoming'
          // 2. Created within the last 2 minutes (to avoid showing old calls on refresh)
          if (notification.status === 'incoming') {
            const notificationTime = notification.timestamp?.toDate?.() || new Date(notification.timestamp);
            const now = new Date();
            const timeDiff = (now - notificationTime) / 1000; // seconds
            
            // Only show if call is less than 2 minutes old
            if (timeDiff < 120) {
              console.log('📞 Valid incoming call (age:', Math.floor(timeDiff), 'seconds)');
              onIncomingCall(notification);
            } else {
              console.log('⏰ Ignoring old call notification (age:', Math.floor(timeDiff), 'seconds)');
              // Clean up old notification
              this.updateCallNotificationStatus(change.doc.id, 'expired').catch(err => {
                console.error('Failed to clean up old notification:', err);
              });
            }
          }
        }
      });
    });

    this.callListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Stop listening for calls
  stopListeningForCalls(userId) {
    const unsubscribe = this.callListeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.callListeners.delete(userId);
    }
  }

  // Update call notification status
  async updateCallNotificationStatus(notificationId, status) {
    try {
      const notificationRef = doc(db, 'callNotifications', notificationId);
      await updateDoc(notificationRef, {
        status: status,
        updatedAt: serverTimestamp()
      });
      console.log(`✅ Call notification ${notificationId} updated to ${status}`);
    } catch (error) {
      console.error('Error updating call notification status:', error);
      throw error;
    }
  }

  // Get call history for a user
  async getCallHistory(userId, limit = 50) {
    try {
      const callsQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      return new Promise((resolve, reject) => {
        const unsubscribe = onSnapshot(callsQuery, (snapshot) => {
          const calls = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          resolve(calls);
        }, reject);

        // Auto-unsubscribe after 5 seconds to prevent memory leaks
        setTimeout(() => unsubscribe(), 5000);
      });
    } catch (error) {
      console.error('Error getting call history:', error);
      throw error;
    }
  }

  // Get recent calls (both incoming and outgoing)
  async getRecentCalls(userId, limit = 20) {
    try {
      // Get outgoing calls
      const outgoingQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      // Get incoming calls
      const incomingQuery = query(
        collection(db, 'calls'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(limit)
      );

      const [outgoingSnapshot, incomingSnapshot] = await Promise.all([
        getDocs(outgoingQuery),
        getDocs(incomingQuery)
      ]);

      const outgoingCalls = outgoingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        direction: 'outgoing'
      }));

      const incomingCalls = incomingSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        direction: 'incoming'
      }));

      // Combine and sort by creation time
      const allCalls = [...outgoingCalls, ...incomingCalls]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, limit);

      return allCalls;
    } catch (error) {
      console.error('Error getting recent calls:', error);
      throw error;
    }
  }

  // Get calls for a user with filter: 'all' | 'missed' | 'received' | 'outgoing'
  async getUserCalls(userId, filter = 'all', limitCount = 50) {
    try {
      // Fetch both directions
      const outgoingQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const incomingQuery = query(
        collection(db, 'calls'),
        where('recipientId', '==', userId),
        orderBy('createdAt', 'desc')
      );

      const [outgoingSnapshot, incomingSnapshot] = await Promise.all([
        getDocs(outgoingQuery),
        getDocs(incomingQuery)
      ]);

      const outgoing = outgoingSnapshot.docs.map(doc => ({ id: doc.id, direction: 'outgoing', ...doc.data() }));
      const incoming = incomingSnapshot.docs.map(doc => ({ id: doc.id, direction: 'incoming', ...doc.data() }));

      let combined = [...outgoing, ...incoming].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

      if (filter === 'missed') {
        combined = combined.filter(c => (c.direction === 'incoming') && (c.status === 'initiating' || c.status === 'rejected'));
      } else if (filter === 'received') {
        combined = combined.filter(c => (c.direction === 'incoming') && c.status === 'answered');
      } else if (filter === 'outgoing') {
        combined = combined.filter(c => c.direction === 'outgoing');
      }

      return combined.slice(0, limitCount);
    } catch (error) {
      console.error('Error getting user calls:', error);
      return [];
    }
  }

  // Get call statistics
  async getCallStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const callsQuery = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        where('createdAt', '>=', startDate)
      );

      const snapshot = await getDocs(callsQuery);
      const calls = snapshot.docs.map(doc => doc.data());

      const stats = {
        totalCalls: calls.length,
        answeredCalls: calls.filter(call => call.status === 'answered').length,
        missedCalls: calls.filter(call => call.status === 'rejected' || call.status === 'initiating').length,
        totalDuration: calls.reduce((total, call) => total + (call.duration || 0), 0),
        averageDuration: 0,
        videoCalls: calls.filter(call => call.callType === 'video').length,
        voiceCalls: calls.filter(call => call.callType === 'audio').length
      };

      if (stats.answeredCalls > 0) {
        stats.averageDuration = stats.totalDuration / stats.answeredCalls;
      }

      return stats;
    } catch (error) {
      console.error('Error getting call stats:', error);
      throw error;
    }
  }

  // Clean up old notifications
  async cleanupOldNotifications(daysOld = 7) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const notificationsQuery = query(
        collection(db, 'callNotifications'),
        where('timestamp', '<', cutoffDate)
      );

      const snapshot = await getDocs(notificationsQuery);
      const batch = [];
      
      snapshot.docs.forEach(doc => {
        batch.push(deleteDoc(doc.ref));
      });

      await Promise.all(batch);
      return { success: true, deletedCount: batch.length };
    } catch (error) {
      console.error('Error cleaning up notifications:', error);
      return { success: false, error: error.message };
    }
  }

  // Get active call
  getActiveCall() {
    return this.activeCall;
  }

  // Set active call
  setActiveCall(call) {
    this.activeCall = call;
  }

  // Clear active call
  clearActiveCall() {
    this.activeCall = null;
  }
}

export default CallService;
