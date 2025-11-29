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
exports.processMedicationLog = exports.sendMedicationReminder = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Send medication reminders
const sendMedicationReminder = async () => {
    try {
        const now = admin.firestore.Timestamp.now();
        const oneHourFromNow = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds);
        // Get all active medication reminders due within the next hour
        const remindersSnapshot = await getDb().collection('medicationReminders')
            .where('nextDoseTime', '<=', oneHourFromNow)
            .where('isActive', '==', true)
            .get();
        const reminders = [];
        remindersSnapshot.forEach(doc => {
            reminders.push(Object.assign({ id: doc.id }, doc.data()));
        });
        // Process each reminder
        for (const reminder of reminders) {
            try {
                // Get user details
                const userDoc = await getDb().collection('users').doc(reminder.userId).get();
                if (!userDoc.exists)
                    continue;
                const userData = userDoc.data();
                // Send notification
                await sendMedicationNotification(reminder, userData);
                // Update next dose time based on frequency
                const nextDoseTime = calculateNextDoseTime(reminder.frequency, now);
                if (!reminder.id) {
                    continue;
                }
                await getDb().collection('medicationReminders').doc(reminder.id).update({
                    nextDoseTime,
                    lastReminderSent: now,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
                // Log the reminder
                await getDb().collection('auditLogs').add({
                    userId: reminder.userId,
                    action: 'MEDICATION_REMINDER_SENT',
                    details: {
                        medicationId: reminder.medicationId,
                        medicationName: reminder.medicationName,
                        dosage: reminder.dosage
                    },
                    timestamp: now,
                    ipAddress: 'system'
                });
                console.log(`Medication reminder sent to user ${reminder.userId} for ${reminder.medicationName}`);
            }
            catch (error) {
                console.error(`Error processing reminder for user ${reminder.userId}:`, error);
            }
        }
        console.log(`Processed ${reminders.length} medication reminders`);
    }
    catch (error) {
        console.error('Error in medication reminder scheduler:', error);
    }
};
exports.sendMedicationReminder = sendMedicationReminder;
// Process medication log entry
const processMedicationLog = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { medicationId, userId, status, notes, takenAt } = data;
        // Check permissions
        if (context.auth.uid !== userId && context.auth.token.role !== 'caregiver' && context.auth.token.role !== 'admin') {
            throw new functions.https.HttpsError('permission-denied', 'Insufficient permissions');
        }
        const timestamp = takenAt || admin.firestore.Timestamp.now();
        // Create medication log entry
        await getDb().collection('medicationLogs').add({
            medicationId,
            userId,
            status,
            notes: notes || '',
            takenAt: timestamp,
            loggedBy: context.auth.uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Update medication reminder if taken
        if (status === 'taken') {
            const reminderSnapshot = await getDb().collection('medicationReminders')
                .where('userId', '==', userId)
                .where('medicationId', '==', medicationId)
                .where('isActive', '==', true)
                .limit(1)
                .get();
            if (!reminderSnapshot.empty) {
                const reminderDoc = reminderSnapshot.docs[0];
                const nextDoseTime = calculateNextDoseTime(reminderDoc.data().frequency, timestamp);
                await reminderDoc.ref.update({
                    nextDoseTime,
                    lastTaken: timestamp,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                });
            }
        }
        // Log the event
        await getDb().collection('auditLogs').add({
            userId: context.auth.uid,
            action: 'MEDICATION_LOG_CREATED',
            details: {
                targetUserId: userId,
                medicationId,
                status,
                notes
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return { success: true, message: 'Medication log recorded successfully' };
    }
    catch (error) {
        console.error('Error processing medication log:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process medication log');
    }
};
exports.processMedicationLog = processMedicationLog;
// Helper function to send medication notification
async function sendMedicationNotification(reminder, userData) {
    try {
        // Create notification document
        await getDb().collection('notifications').add({
            userId: reminder.userId,
            type: 'medication_reminder',
            title: 'Medication Reminder',
            message: `Time to take ${reminder.medicationName} (${reminder.dosage})`,
            data: {
                medicationId: reminder.medicationId,
                medicationName: reminder.medicationName,
                dosage: reminder.dosage
            },
            isRead: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
        // Send push notification if user has FCM token
        if (userData.fcmToken) {
            const message = {
                token: userData.fcmToken,
                notification: {
                    title: 'Medication Reminder',
                    body: `Time to take ${reminder.medicationName} (${reminder.dosage})`
                },
                data: {
                    type: 'medication_reminder',
                    medicationId: reminder.medicationId
                }
            };
            await admin.messaging().send(message);
        }
    }
    catch (error) {
        console.error('Error sending medication notification:', error);
    }
}
// Helper function to calculate next dose time
function calculateNextDoseTime(frequency, currentTime) {
    const now = new Date(currentTime.seconds * 1000);
    let nextTime = new Date(now);
    switch (frequency.toLowerCase()) {
        case 'daily':
            nextTime.setDate(now.getDate() + 1);
            break;
        case 'twice daily':
            nextTime.setHours(now.getHours() + 12);
            break;
        case 'three times daily':
            nextTime.setHours(now.getHours() + 8);
            break;
        case 'weekly':
            nextTime.setDate(now.getDate() + 7);
            break;
        case 'monthly':
            nextTime.setMonth(now.getMonth() + 1);
            break;
        default:
            // Default to daily
            nextTime.setDate(now.getDate() + 1);
    }
    return admin.firestore.Timestamp.fromDate(nextTime);
}
//# sourceMappingURL=medicationManagement.js.map