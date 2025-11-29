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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.processScheduledNotifications = exports.scheduleNotification = exports.sendNotification = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Send notification
const sendNotification = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, type, title, message, data: notificationData, priority = 'normal' } = data;
        // Check permissions
        if (context.auth.uid !== userId && context.auth.token.role !== 'caregiver' && context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        // Create notification document
        const notificationRef = await getDb().collection('notifications').add({
            userId,
            type,
            title,
            message,
            data: notificationData || {},
            priority,
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Send push notification if user has FCM token
        const userDoc = await getDb().collection('users').doc(userId).get();
        if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                await sendPushNotification(userData.fcmToken, title, message, notificationData, priority);
            }
        }
        // Log the event
        await getDb().collection('auditLogs').add({
            userId: context.auth.uid,
            action: 'NOTIFICATION_SENT',
            details: {
                targetUserId: userId,
                type,
                title,
                message
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return {
            success: true,
            notificationId: notificationRef.id,
            message: 'Notification sent successfully'
        };
    }
    catch (error) {
        console.error('Error sending notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to send notification');
    }
};
exports.sendNotification = sendNotification;
// Schedule notification
const scheduleNotification = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { userId, type, title, message, data: notificationData, scheduledFor, priority = 'normal' } = data;
        // Check permissions
        if (context.auth.uid !== userId && context.auth.token.role !== 'caregiver' && context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        // Create scheduled notification document
        const notificationRef = await getDb().collection('scheduledNotifications').add({
            userId,
            type,
            title,
            message,
            data: notificationData || {},
            priority,
            scheduledFor,
            status: 'scheduled',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Log the event
        await getDb().collection('auditLogs').add({
            userId: context.auth.uid,
            action: 'NOTIFICATION_SCHEDULED',
            details: {
                targetUserId: userId,
                type,
                title,
                message,
                scheduledFor: scheduledFor.toDate().toISOString()
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return {
            success: true,
            notificationId: notificationRef.id,
            message: 'Notification scheduled successfully'
        };
    }
    catch (error) {
        console.error('Error scheduling notification:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to schedule notification');
    }
};
exports.scheduleNotification = scheduleNotification;
// Helper function to send push notification
async function sendPushNotification(fcmToken, title, message, data, priority = 'normal') {
    try {
        const messagePayload = {
            token: fcmToken,
            notification: {
                title,
                body: message
            },
            data: Object.assign(Object.assign({}, data), { timestamp: new Date().toISOString() }),
            android: {
                priority: priority === 'high' ? 'high' : 'normal',
                notification: {
                    sound: 'default'
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        badge: 1
                    }
                }
            }
        };
        await admin.messaging().send(messagePayload);
        console.log(`Push notification sent to ${fcmToken}`);
    }
    catch (error) {
        console.error('Error sending push notification:', error);
        // Don't throw error here as it's not critical for the main function
    }
}
// Scheduled function to process scheduled notifications
exports.processScheduledNotifications = functions.pubsub
    .schedule('every 1 minutes')
    .onRun(async () => {
    try {
        const now = admin.firestore.Timestamp.now();
        // Get all scheduled notifications that are due
        const scheduledNotificationsSnapshot = await getDb().collection('scheduledNotifications')
            .where('scheduledFor', '<=', now)
            .where('status', '==', 'scheduled')
            .get();
        for (const doc of scheduledNotificationsSnapshot.docs) {
            const notification = doc.data();
            try {
                // Send the notification
                await getDb().collection('notifications').add({
                    userId: notification.userId,
                    type: notification.type,
                    title: notification.title,
                    message: notification.message,
                    data: notification.data,
                    priority: notification.priority,
                    isRead: false,
                    createdAt: admin.firestore.FieldValue.serverTimestamp()
                });
                // Send push notification if user has FCM token
                const userDoc = await getDb().collection('users').doc(notification.userId).get();
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData === null || userData === void 0 ? void 0 : userData.fcmToken) {
                        await sendPushNotification(userData.fcmToken, notification.title, notification.message, notification.data, notification.priority);
                    }
                }
                // Update scheduled notification status
                await doc.ref.update({
                    status: 'sent',
                    sentAt: admin.firestore.FieldValue.serverTimestamp()
                });
                console.log(`Scheduled notification sent for user ${notification.userId}`);
            }
            catch (error) {
                console.error(`Error processing scheduled notification ${doc.id}:`, error);
                // Mark as failed
                await doc.ref.update({
                    status: 'failed',
                    error: String(error && error.message || error),
                    failedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        console.log(`Processed ${scheduledNotificationsSnapshot.size} scheduled notifications`);
    }
    catch (error) {
        console.error('Error in scheduled notification processor:', error);
    }
});
//# sourceMappingURL=notificationService.js.map