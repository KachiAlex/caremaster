"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanupAuditLogs = exports.getAuditLogs = exports.logAuditEvent = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Log audit event
const logAuditEvent = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { action, details, targetUserId } = data;
        const userId = context.auth.uid;
        // Create audit log entry
        await getDb().collection('auditLogs').add({
            userId,
            action,
            details,
            targetUserId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip,
            userAgent: context.rawRequest.headers['user-agent'] || 'unknown'
        });
        return { success: true, message: 'Audit event logged successfully' };
    }
    catch (error) {
        console.error('Error logging audit event:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to log audit event');
    }
};
exports.logAuditEvent = logAuditEvent;
// Get audit logs
const getAuditLogs = async (data, context) => {
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
        let query = getDb().collection('auditLogs').orderBy('timestamp', 'desc');
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
        const auditLogs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Get total count for pagination
        const totalSnapshot = await getDb().collection('auditLogs').get();
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
    }
    catch (error) {
        console.error('Error getting audit logs:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to get audit logs');
    }
};
exports.getAuditLogs = getAuditLogs;
// Clean up old audit logs (scheduled function)
exports.cleanupAuditLogs = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
        const cutoffDate = admin.firestore.Timestamp.fromDate(sixMonthsAgo);
        // Get old audit logs
        const oldLogsSnapshot = await getDb().collection('auditLogs')
            .where('timestamp', '<', cutoffDate)
            .limit(1000) // Process in batches
            .get();
        if (oldLogsSnapshot.empty) {
            console.log('No old audit logs to clean up');
            return;
        }
        // Delete old logs
        const batch = getDb().batch();
        oldLogsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        await batch.commit();
        console.log(`Cleaned up ${oldLogsSnapshot.size} old audit logs`);
    }
    catch (error) {
        console.error('Error cleaning up audit logs:', error);
    }
});
//# sourceMappingURL=auditLogging.js.map