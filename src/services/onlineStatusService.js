import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  query,
  where,
  serverTimestamp,
  getDoc
} from 'backend/database';
import { db } from '../backend/config';

class OnlineStatusService {
  constructor() {
    this.userId = null;
    this.statusRef = null;
    this.heartbeatInterval = null;
    this.isOnline = false;
    this.statusListeners = new Map();
  }

  // Initialize online status for a user
  async initialize(userId) {
    this.userId = userId;
    this.statusRef = doc(db, 'userStatus', userId);
    
    // Set user as online
    await this.setOnline();
    
    // Start heartbeat to maintain online status
    this.startHeartbeat();
    
    // Set up cleanup on page unload
    window.addEventListener('beforeunload', () => {
      this.setOffline();
    });
    
    // Set up cleanup on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.setOffline();
      } else {
        this.setOnline();
      }
    });
  }

  // Set user as online
  async setOnline() {
    if (!this.statusRef) return;
    
    try {
      await setDoc(this.statusRef, {
        isOnline: true,
        lastSeen: serverTimestamp(),
        status: 'online'
      }, { merge: true });
      this.isOnline = true;
    } catch (error) {
      console.error('Error setting online status:', error);
    }
  }

  // Set user as offline
  async setOffline() {
    if (!this.statusRef) return;
    
    try {
      await setDoc(this.statusRef, {
        isOnline: false,
        lastSeen: serverTimestamp(),
        status: 'offline'
      }, { merge: true });
      this.isOnline = false;
    } catch (error) {
      console.error('Error setting offline status:', error);
    }
  }

  // Start heartbeat to maintain online status
  startHeartbeat() {
    // Update status every 30 seconds
    this.heartbeatInterval = setInterval(() => {
      if (this.isOnline) {
        this.setOnline();
      }
    }, 30000);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Listen to user status changes
  listenToUserStatus(userId, callback) {
    const statusRef = doc(db, 'userStatus', userId);
    
    const unsubscribe = onSnapshot(statusRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        callback({
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen,
          status: data.status || 'offline'
        });
      } else {
        callback({
          isOnline: false,
          lastSeen: null,
          status: 'offline'
        });
      }
    });

    this.statusListeners.set(userId, unsubscribe);
    return unsubscribe;
  }

  // Listen to multiple users' status
  listenToMultipleUsers(userIds, callback) {
    const statuses = {};
    const unsubscribes = [];

    userIds.forEach(userId => {
      const unsubscribe = this.listenToUserStatus(userId, (status) => {
        statuses[userId] = status;
        callback(statuses);
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(unsubscribe => unsubscribe());
    };
  }

  // Get user status (one-time)
  async getUserStatus(userId) {
    try {
      const statusRef = doc(db, 'userStatus', userId);
      const docSnap = await getDoc(statusRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        return {
          isOnline: data.isOnline || false,
          lastSeen: data.lastSeen,
          status: data.status || 'offline'
        };
      } else {
        return {
          isOnline: false,
          lastSeen: null,
          status: 'offline'
        };
      }
    } catch (error) {
      console.error('Error getting user status:', error);
      return {
        isOnline: false,
        lastSeen: null,
        status: 'offline'
      };
    }
  }

  // Cleanup
  async cleanup() {
    this.stopHeartbeat();
    await this.setOffline();
    
    // Unsubscribe from all listeners
    this.statusListeners.forEach(unsubscribe => unsubscribe());
    this.statusListeners.clear();
  }

  // Get current user's online status
  getCurrentStatus() {
    return this.isOnline;
  }
}

export default OnlineStatusService;
