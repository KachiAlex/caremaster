import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Log audit event
export const logAuditEvent = async (data: {
  action: string;
  details: any;
  targetUserId?: string;
}, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { action, details, targetUserId } = data;
    const userId = context.auth.uid;

    // Create audit log entry
    await db.collection('auditLogs').add({
      userId,
      action,
      details,
      targetUserId,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip,
      userAgent: context.rawRequest.headers['user-agent'] || 'unknown'
    });

    return { success: true, message: 'Audit event logged successfully' };
  } catch (error) {
    console.error('Error logging audit event:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to log audit event');
  }
};

// Get audit logs
export const getAuditLogs = async (data: {
  userId?: string;
  action?: string;
  startDate?: admin.firestore.Timestamp;
  endDate?: admin.firestore.Timestamp;
  limit?: number;
  offset?: number;
}, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { userId, action, startDate, endDate, limit = 50, offset = 0 } = data;
    const requestingUserId = context.auth.uid;
    const userRole = context.auth.token.role;

    // Check permissions
    if (userId && userId !== requestingUserId && userRole !== 'admin' && userRole !== 'caregiver') {
      throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions to view audit logs');
    }

    // Build query
    let query = db.collection('auditLogs').orderBy('timestamp', 'desc');

    // Apply filters
    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (action) {
      query = query.where('action', '==', action);
    }

    if (startDate) {
      query = query.where('timestamp', '>=', startDate);
    }

    if (endDate) {
      query = query.where('timestamp', '<=', endDate);
    }

    // Apply pagination
    query = query.limit(limit).offset(offset);

    // Execute query
    const snapshot = await query.get();
    const auditLogs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get total count for pagination
    const totalSnapshot = await db.collection('auditLogs').get();
    const totalCount = totalSnapshot.size;

    return {
      success: true,
      auditLogs,
      pagination: {
        total: totalCount,
        limit,
        offset,
        hasMore: offset + limit < totalCount
      }
    };
  } catch (error) {
    console.error('Error getting audit logs:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to get audit logs');
  }
};

// Clean up old audit logs (scheduled function)
export const cleanupAuditLogs = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const cutoffDate = admin.firestore.Timestamp.fromDate(sixMonthsAgo);

      // Get old audit logs
      const oldLogsSnapshot = await db.collection('auditLogs')
        .where('timestamp', '<', cutoffDate)
        .limit(1000) // Process in batches
        .get();

      if (oldLogsSnapshot.empty) {
        console.log('No old audit logs to clean up');
        return;
      }

      // Delete old logs
      const batch = db.batch();
      oldLogsSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });

      await batch.commit();

      console.log(`Cleaned up ${oldLogsSnapshot.size} old audit logs`);
    } catch (error) {
      console.error('Error cleaning up audit logs:', error);
    }
  });
