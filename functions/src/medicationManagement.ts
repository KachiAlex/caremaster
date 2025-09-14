import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface MedicationReminder {
  userId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  nextDoseTime: admin.firestore.Timestamp;
  isActive: boolean;
}

// Send medication reminders
export const sendMedicationReminder = async () => {
  try {
    const now = admin.firestore.Timestamp.now();
    const oneHourFromNow = new admin.firestore.Timestamp(now.seconds + 3600, now.nanoseconds);

    // Get all active medication reminders due within the next hour
    const remindersSnapshot = await db.collection('medicationReminders')
      .where('nextDoseTime', '<=', oneHourFromNow)
      .where('isActive', '==', true)
      .get();

    const reminders: MedicationReminder[] = [];
    remindersSnapshot.forEach(doc => {
      reminders.push({ id: doc.id, ...doc.data() } as MedicationReminder & { id: string });
    });

    // Process each reminder
    for (const reminder of reminders) {
      try {
        // Get user details
        const userDoc = await db.collection('users').doc(reminder.userId).get();
        if (!userDoc.exists) continue;

        const userData = userDoc.data();
        
        // Send notification
        await sendMedicationNotification(reminder, userData);

        // Update next dose time based on frequency
        const nextDoseTime = calculateNextDoseTime(reminder.frequency, now);
        
        await db.collection('medicationReminders').doc(reminder.id).update({
          nextDoseTime,
          lastReminderSent: now,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Log the reminder
        await db.collection('auditLogs').add({
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
      } catch (error) {
        console.error(`Error processing reminder for user ${reminder.userId}:`, error);
      }
    }

    console.log(`Processed ${reminders.length} medication reminders`);
  } catch (error) {
    console.error('Error in medication reminder scheduler:', error);
  }
};

// Process medication log entry
export const processMedicationLog = async (data: {
  medicationId: string;
  userId: string;
  status: 'taken' | 'missed' | 'skipped';
  notes?: string;
  takenAt?: admin.firestore.Timestamp;
}, context: functions.https.CallableContext) => {
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
    await db.collection('medicationLogs').add({
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
      const reminderSnapshot = await db.collection('medicationReminders')
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
    await db.collection('auditLogs').add({
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
  } catch (error) {
    console.error('Error processing medication log:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process medication log');
  }
};

// Helper function to send medication notification
async function sendMedicationNotification(reminder: MedicationReminder, userData: any) {
  try {
    // Create notification document
    await db.collection('notifications').add({
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
  } catch (error) {
    console.error('Error sending medication notification:', error);
  }
}

// Helper function to calculate next dose time
function calculateNextDoseTime(frequency: string, currentTime: admin.firestore.Timestamp): admin.firestore.Timestamp {
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
