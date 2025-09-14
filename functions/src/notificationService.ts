import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// Send notification
export const sendNotification = async (data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  priority?: 'low' | 'normal' | 'high';
}, context: functions.https.CallableContext) => {
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
    const notificationRef = await db.collection('notifications').add({
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
    const userDoc = await db.collection('users').doc(userId).get();
    if (userDoc.exists) {
      const userData = userDoc.data();
      if (userData?.fcmToken) {
        await sendPushNotification(userData.fcmToken, title, message, notificationData, priority);
      }
    }

    // Log the event
    await db.collection('auditLogs').add({
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
  } catch (error) {
    console.error('Error sending notification:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to send notification');
  }
};

// Schedule notification
export const scheduleNotification = async (data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  scheduledFor: admin.firestore.Timestamp;
  priority?: 'low' | 'normal' | 'high';
}, context: functions.https.CallableContext) => {
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
    const notificationRef = await db.collection('scheduledNotifications').add({
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
    await db.collection('auditLogs').add({
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
  } catch (error) {
    console.error('Error scheduling notification:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to schedule notification');
  }
};

// Helper function to send push notification
async function sendPushNotification(
  fcmToken: string,
  title: string,
  message: string,
  data?: any,
  priority: 'low' | 'normal' | 'high' = 'normal'
) {
  try {
    const messagePayload = {
      token: fcmToken,
      notification: {
        title,
        body: message
      },
      data: {
        ...data,
        timestamp: new Date().toISOString()
      },
      android: {
        priority: priority === 'high' ? 'high' : 'normal',
        notification: {
          sound: 'default',
          priority: priority === 'high' ? 'high' : 'normal'
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
  } catch (error) {
    console.error('Error sending push notification:', error);
    // Don't throw error here as it's not critical for the main function
  }
}

// Scheduled function to process scheduled notifications
export const processScheduledNotifications = functions.pubsub
  .schedule('every 1 minutes')
  .onRun(async () => {
    try {
      const now = admin.firestore.Timestamp.now();
      
      // Get all scheduled notifications that are due
      const scheduledNotificationsSnapshot = await db.collection('scheduledNotifications')
        .where('scheduledFor', '<=', now)
        .where('status', '==', 'scheduled')
        .get();

      for (const doc of scheduledNotificationsSnapshot.docs) {
        const notification = doc.data();
        
        try {
          // Send the notification
          await db.collection('notifications').add({
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
          const userDoc = await db.collection('users').doc(notification.userId).get();
          if (userDoc.exists) {
            const userData = userDoc.data();
            if (userData?.fcmToken) {
              await sendPushNotification(
                userData.fcmToken,
                notification.title,
                notification.message,
                notification.data,
                notification.priority
              );
            }
          }

          // Update scheduled notification status
          await doc.ref.update({
            status: 'sent',
            sentAt: admin.firestore.FieldValue.serverTimestamp()
          });

          console.log(`Scheduled notification sent for user ${notification.userId}`);
        } catch (error) {
          console.error(`Error processing scheduled notification ${doc.id}:`, error);
          
          // Mark as failed
          await doc.ref.update({
            status: 'failed',
            error: error.message,
            failedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      console.log(`Processed ${scheduledNotificationsSnapshot.size} scheduled notifications`);
    } catch (error) {
      console.error('Error in scheduled notification processor:', error);
    }
  });
