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
  serverTimestamp,
  getDoc,
  Timestamp
} from 'firebase/firestore';

export const auditAPI = {
  // Create audit log entry
  createAuditLog: async (auditData) => {
    try {
      const auditRef = await addDoc(collection(db, 'auditLogs'), {
        ...auditData,
        timestamp: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return { id: auditRef.id, success: true };
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw error;
    }
  },

  // Get audit logs with filtering
  getAuditLogs: async (filters = {}) => {
    try {
      let auditQuery = query(
        collection(db, 'auditLogs'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.action) {
        auditQuery = query(auditQuery, where('action', '==', filters.action));
      }
      
      if (filters.user) {
        auditQuery = query(auditQuery, where('user', '==', filters.user));
      }
      
      if (filters.resource) {
        auditQuery = query(auditQuery, where('resource', '==', filters.resource));
      }
      
      if (filters.status) {
        auditQuery = query(auditQuery, where('status', '==', filters.status));
      }
      
      if (filters.severity) {
        auditQuery = query(auditQuery, where('severity', '==', filters.severity));
      }
      
      if (filters.category) {
        auditQuery = query(auditQuery, where('category', '==', filters.category));
      }
      
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        if (startDate) {
          auditQuery = query(auditQuery, where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
        }
        if (endDate) {
          auditQuery = query(auditQuery, where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))));
        }
      }
      
      if (filters.limit) {
        auditQuery = query(auditQuery, limit(filters.limit));
      }

      const auditSnapshot = await getDocs(auditQuery);
      const auditLogs = [];

      auditSnapshot.forEach((doc) => {
        auditLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return auditLogs;
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      throw error;
    }
  },

  // Get audit log by ID
  getAuditLogById: async (logId) => {
    try {
      const auditRef = doc(db, 'auditLogs', logId);
      const auditDoc = await getDoc(auditRef);
      
      if (auditDoc.exists()) {
        return {
          id: auditDoc.id,
          ...auditDoc.data(),
          timestamp: auditDoc.data().timestamp?.toDate(),
          createdAt: auditDoc.data().createdAt?.toDate(),
          updatedAt: auditDoc.data().updatedAt?.toDate()
        };
      }
      
      throw new Error('Audit log not found');
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  },

  // Get audit statistics
  getAuditStats: async (dateRange = {}) => {
    try {
      const stats = {
        totalLogs: 0,
        todayLogs: 0,
        securityEvents: 0,
        systemEvents: 0,
        userEvents: 0,
        dataEvents: 0,
        criticalEvents: 0,
        warningEvents: 0,
        failedEvents: 0,
        successfulEvents: 0
      };

      // Get all audit logs
      const auditSnapshot = await getDocs(collection(db, 'auditLogs'));
      stats.totalLogs = auditSnapshot.size;

      // Get today's logs
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayQuery = query(
        collection(db, 'auditLogs'),
        where('timestamp', '>=', Timestamp.fromDate(today))
      );
      const todaySnapshot = await getDocs(todayQuery);
      stats.todayLogs = todaySnapshot.size;

      // Get logs by category
      const securityQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'security')
      );
      const securitySnapshot = await getDocs(securityQuery);
      stats.securityEvents = securitySnapshot.size;

      const systemQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'system')
      );
      const systemSnapshot = await getDocs(systemQuery);
      stats.systemEvents = systemSnapshot.size;

      const userQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'user')
      );
      const userSnapshot = await getDocs(userQuery);
      stats.userEvents = userSnapshot.size;

      const dataQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'data')
      );
      const dataSnapshot = await getDocs(dataQuery);
      stats.dataEvents = dataSnapshot.size;

      // Get logs by severity
      const criticalQuery = query(
        collection(db, 'auditLogs'),
        where('severity', '==', 'CRITICAL')
      );
      const criticalSnapshot = await getDocs(criticalQuery);
      stats.criticalEvents = criticalSnapshot.size;

      const warningQuery = query(
        collection(db, 'auditLogs'),
        where('severity', '==', 'WARNING')
      );
      const warningSnapshot = await getDocs(warningQuery);
      stats.warningEvents = warningSnapshot.size;

      // Get logs by status
      const failedQuery = query(
        collection(db, 'auditLogs'),
        where('status', '==', 'FAILED')
      );
      const failedSnapshot = await getDocs(failedQuery);
      stats.failedEvents = failedSnapshot.size;

      const successQuery = query(
        collection(db, 'auditLogs'),
        where('status', '==', 'SUCCESS')
      );
      const successSnapshot = await getDocs(successQuery);
      stats.successfulEvents = successSnapshot.size;

      return stats;
    } catch (error) {
      console.error('Error fetching audit stats:', error);
      throw error;
    }
  },

  // Get audit logs by user
  getAuditLogsByUser: async (userId, filters = {}) => {
    try {
      let userAuditQuery = query(
        collection(db, 'auditLogs'),
        where('userId', '==', userId),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.action) {
        userAuditQuery = query(userAuditQuery, where('action', '==', filters.action));
      }
      
      if (filters.dateRange) {
        const { startDate, endDate } = filters.dateRange;
        if (startDate) {
          userAuditQuery = query(userAuditQuery, where('timestamp', '>=', Timestamp.fromDate(new Date(startDate))));
        }
        if (endDate) {
          userAuditQuery = query(userAuditQuery, where('timestamp', '<=', Timestamp.fromDate(new Date(endDate))));
        }
      }
      
      if (filters.limit) {
        userAuditQuery = query(userAuditQuery, limit(filters.limit));
      }

      const userAuditSnapshot = await getDocs(userAuditQuery);
      const userAuditLogs = [];

      userAuditSnapshot.forEach((doc) => {
        userAuditLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return userAuditLogs;
    } catch (error) {
      console.error('Error fetching user audit logs:', error);
      throw error;
    }
  },

  // Get audit logs by resource
  getAuditLogsByResource: async (resourceType, resourceId, filters = {}) => {
    try {
      let resourceAuditQuery = query(
        collection(db, 'auditLogs'),
        where('resource', '==', resourceType),
        where('resourceId', '==', resourceId),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.action) {
        resourceAuditQuery = query(resourceAuditQuery, where('action', '==', filters.action));
      }
      
      if (filters.limit) {
        resourceAuditQuery = query(resourceAuditQuery, limit(filters.limit));
      }

      const resourceAuditSnapshot = await getDocs(resourceAuditQuery);
      const resourceAuditLogs = [];

      resourceAuditSnapshot.forEach((doc) => {
        resourceAuditLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return resourceAuditLogs;
    } catch (error) {
      console.error('Error fetching resource audit logs:', error);
      throw error;
    }
  },

  // Get security events
  getSecurityEvents: async (filters = {}) => {
    try {
      let securityQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'security'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.severity) {
        securityQuery = query(securityQuery, where('severity', '==', filters.severity));
      }
      
      if (filters.action) {
        securityQuery = query(securityQuery, where('action', '==', filters.action));
      }
      
      if (filters.limit) {
        securityQuery = query(securityQuery, limit(filters.limit));
      }

      const securitySnapshot = await getDocs(securityQuery);
      const securityEvents = [];

      securitySnapshot.forEach((doc) => {
        securityEvents.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return securityEvents;
    } catch (error) {
      console.error('Error fetching security events:', error);
      throw error;
    }
  },

  // Get failed login attempts
  getFailedLoginAttempts: async (filters = {}) => {
    try {
      let failedLoginQuery = query(
        collection(db, 'auditLogs'),
        where('action', '==', 'LOGIN_FAILED'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.user) {
        failedLoginQuery = query(failedLoginQuery, where('user', '==', filters.user));
      }
      
      if (filters.ipAddress) {
        failedLoginQuery = query(failedLoginQuery, where('ipAddress', '==', filters.ipAddress));
      }
      
      if (filters.limit) {
        failedLoginQuery = query(failedLoginQuery, limit(filters.limit));
      }

      const failedLoginSnapshot = await getDocs(failedLoginQuery);
      const failedLogins = [];

      failedLoginSnapshot.forEach((doc) => {
        failedLogins.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return failedLogins;
    } catch (error) {
      console.error('Error fetching failed login attempts:', error);
      throw error;
    }
  },

  // Get data access logs
  getDataAccessLogs: async (filters = {}) => {
    try {
      let dataAccessQuery = query(
        collection(db, 'auditLogs'),
        where('category', '==', 'data'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.action) {
        dataAccessQuery = query(dataAccessQuery, where('action', '==', filters.action));
      }
      
      if (filters.resource) {
        dataAccessQuery = query(dataAccessQuery, where('resource', '==', filters.resource));
      }
      
      if (filters.limit) {
        dataAccessQuery = query(dataAccessQuery, limit(filters.limit));
      }

      const dataAccessSnapshot = await getDocs(dataAccessQuery);
      const dataAccessLogs = [];

      dataAccessSnapshot.forEach((doc) => {
        dataAccessLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return dataAccessLogs;
    } catch (error) {
      console.error('Error fetching data access logs:', error);
      throw error;
    }
  },

  // Get system configuration changes
  getSystemConfigChanges: async (filters = {}) => {
    try {
      let configQuery = query(
        collection(db, 'auditLogs'),
        where('action', '==', 'SYSTEM_CONFIG'),
        orderBy('timestamp', 'desc')
      );
      
      if (filters.resource) {
        configQuery = query(configQuery, where('resource', '==', filters.resource));
      }
      
      if (filters.limit) {
        configQuery = query(configQuery, limit(filters.limit));
      }

      const configSnapshot = await getDocs(configQuery);
      const configChanges = [];

      configSnapshot.forEach((doc) => {
        configChanges.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });

      return configChanges;
    } catch (error) {
      console.error('Error fetching system config changes:', error);
      throw error;
    }
  },

  // Export audit logs
  exportAuditLogs: async (filters = {}) => {
    try {
      const auditLogs = await auditAPI.getAuditLogs(filters);
      
      // Convert to CSV format
      const csvHeaders = [
        'Timestamp',
        'Action',
        'User',
        'Resource',
        'Resource ID',
        'Status',
        'Severity',
        'IP Address',
        'Category',
        'Details'
      ];
      
      const csvRows = auditLogs.map(log => [
        log.timestamp?.toISOString() || '',
        log.action || '',
        log.user || '',
        log.resource || '',
        log.resourceId || '',
        log.status || '',
        log.severity || '',
        log.ipAddress || '',
        log.category || '',
        JSON.stringify(log.details || {})
      ]);
      
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(','))
        .join('\n');
      
      return {
        content: csvContent,
        filename: `audit_logs_${new Date().toISOString().split('T')[0]}.csv`,
        mimeType: 'text/csv'
      };
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      throw error;
    }
  },

  // Subscribe to audit logs
  subscribeToAuditLogs: (callback, filters = {}) => {
    let auditQuery = query(
      collection(db, 'auditLogs'),
      orderBy('timestamp', 'desc')
    );
    
    if (filters.category) {
      auditQuery = query(auditQuery, where('category', '==', filters.category));
    }
    
    if (filters.severity) {
      auditQuery = query(auditQuery, where('severity', '==', filters.severity));
    }
    
    if (filters.limit) {
      auditQuery = query(auditQuery, limit(filters.limit));
    }
    
    return onSnapshot(auditQuery, (snapshot) => {
      const auditLogs = [];
      snapshot.forEach((doc) => {
        auditLogs.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(auditLogs);
    });
  },

  // Subscribe to security events
  subscribeToSecurityEvents: (callback, filters = {}) => {
    let securityQuery = query(
      collection(db, 'auditLogs'),
      where('category', '==', 'security'),
      orderBy('timestamp', 'desc')
    );
    
    if (filters.severity) {
      securityQuery = query(securityQuery, where('severity', '==', filters.severity));
    }
    
    if (filters.limit) {
      securityQuery = query(securityQuery, limit(filters.limit));
    }
    
    return onSnapshot(securityQuery, (snapshot) => {
      const securityEvents = [];
      snapshot.forEach((doc) => {
        securityEvents.push({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate(),
          createdAt: doc.data().createdAt?.toDate(),
          updatedAt: doc.data().updatedAt?.toDate()
        });
      });
      callback(securityEvents);
    });
  },

  // Log user login
  logUserLogin: async (userData) => {
    try {
      return await auditAPI.createAuditLog({
        action: 'LOGIN',
        user: userData.email || userData.uid,
        userId: userData.uid,
        resource: 'Authentication',
        resourceId: `auth_${userData.uid}`,
        status: 'SUCCESS',
        severity: 'INFO',
        ipAddress: userData.ipAddress || 'unknown',
        userAgent: userData.userAgent || 'unknown',
        details: {
          loginMethod: userData.loginMethod || 'email_password',
          sessionId: userData.sessionId || null,
          location: userData.location || null
        },
        category: 'security'
      });
    } catch (error) {
      console.error('Error logging user login:', error);
      throw error;
    }
  },

  // Log user logout
  logUserLogout: async (userData) => {
    try {
      return await auditAPI.createAuditLog({
        action: 'LOGOUT',
        user: userData.email || userData.uid,
        userId: userData.uid,
        resource: 'Authentication',
        resourceId: `auth_${userData.uid}`,
        status: 'SUCCESS',
        severity: 'INFO',
        ipAddress: userData.ipAddress || 'unknown',
        userAgent: userData.userAgent || 'unknown',
        details: {
          sessionId: userData.sessionId || null,
          sessionDuration: userData.sessionDuration || null
        },
        category: 'security'
      });
    } catch (error) {
      console.error('Error logging user logout:', error);
      throw error;
    }
  },

  // Log failed login attempt
  logFailedLogin: async (loginData) => {
    try {
      return await auditAPI.createAuditLog({
        action: 'LOGIN_FAILED',
        user: loginData.email || loginData.uid || 'unknown',
        userId: loginData.uid || null,
        resource: 'Authentication',
        resourceId: `auth_failed_${Date.now()}`,
        status: 'FAILED',
        severity: 'WARNING',
        ipAddress: loginData.ipAddress || 'unknown',
        userAgent: loginData.userAgent || 'unknown',
        details: {
          loginMethod: loginData.loginMethod || 'email_password',
          failureReason: loginData.failureReason || 'Invalid credentials',
          attemptCount: loginData.attemptCount || 1
        },
        category: 'security'
      });
    } catch (error) {
      console.error('Error logging failed login:', error);
      throw error;
    }
  },

  // Log data access
  logDataAccess: async (accessData) => {
    try {
      return await auditAPI.createAuditLog({
        action: accessData.action || 'ACCESS',
        user: accessData.user,
        userId: accessData.userId,
        resource: accessData.resource,
        resourceId: accessData.resourceId,
        status: accessData.status || 'SUCCESS',
        severity: accessData.severity || 'INFO',
        ipAddress: accessData.ipAddress || 'unknown',
        userAgent: accessData.userAgent || 'unknown',
        details: accessData.details || {},
        changes: accessData.changes || null,
        category: 'data'
      });
    } catch (error) {
      console.error('Error logging data access:', error);
      throw error;
    }
  },

  // Log system event
  logSystemEvent: async (eventData) => {
    try {
      return await auditAPI.createAuditLog({
        action: eventData.action,
        user: eventData.user || 'system',
        userId: eventData.userId || 'system',
        resource: eventData.resource,
        resourceId: eventData.resourceId,
        status: eventData.status || 'SUCCESS',
        severity: eventData.severity || 'INFO',
        ipAddress: eventData.ipAddress || 'system',
        userAgent: eventData.userAgent || 'system',
        details: eventData.details || {},
        changes: eventData.changes || null,
        category: 'system'
      });
    } catch (error) {
      console.error('Error logging system event:', error);
      throw error;
    }
  }
};
