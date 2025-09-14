import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

interface EmergencyAlert {
  userId: string;
  type: 'medical' | 'fall' | 'panic' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  description?: string;
  timestamp: admin.firestore.Timestamp;
}

// Handle emergency alert
export const handleEmergencyAlert = async (data: {
  type: 'medical' | 'fall' | 'panic' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  description?: string;
}, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { type, severity, location, description } = data;
    const userId = context.auth.uid;
    const timestamp = admin.firestore.Timestamp.now();

    // Get user profile and emergency contacts
    const userDoc = await db.collection('users').doc(userId).get();
    const elderlyProfileDoc = await db.collection('elderlyProfiles').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User profile not found');
    }

    const userData = userDoc.data();
    const elderlyProfileData = elderlyProfileDoc.exists ? elderlyProfileDoc.data() : null;

    // Create emergency alert record
    const alertData: EmergencyAlert = {
      userId,
      type,
      severity,
      location,
      description,
      timestamp
    };

    const alertRef = await db.collection('emergencyAlerts').add({
      ...alertData,
      status: 'active',
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Determine response based on severity
    const responseActions = await determineEmergencyResponse(severity, userData, elderlyProfileData);

    // Send notifications to emergency contacts
    if (elderlyProfileData?.emergencyContactPhone) {
      await sendEmergencyNotification(alertData, userData, elderlyProfileData);
    }

    // Send notifications to caregivers
    await notifyCaregivers(userId, alertData, userData);

    // Send notifications to healthcare providers if critical
    if (severity === 'critical' || severity === 'high') {
      await notifyHealthcareProviders(userId, alertData, userData);
    }

    // Log the emergency
    await db.collection('auditLogs').add({
      userId,
      action: 'EMERGENCY_ALERT_CREATED',
      details: {
        alertId: alertRef.id,
        type,
        severity,
        location,
        description
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip
    });

    return {
      success: true,
      alertId: alertRef.id,
      message: 'Emergency alert processed successfully',
      responseActions
    };
  } catch (error) {
    console.error('Error handling emergency alert:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process emergency alert');
  }
};

// Process emergency response
export const processEmergencyResponse = async (data: {
  alertId: string;
  responseType: 'acknowledged' | 'resolved' | 'escalated';
  notes?: string;
  responderId?: string;
}, context: functions.https.CallableContext) => {
  try {
    // Verify authentication
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { alertId, responseType, notes, responderId } = data;
    const responderUserId = context.auth.uid;

    // Get the emergency alert
    const alertDoc = await db.collection('emergencyAlerts').doc(alertId).get();
    if (!alertDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Emergency alert not found');
    }

    const alertData = alertDoc.data();

    // Update alert status
    await db.collection('emergencyAlerts').doc(alertId).update({
      status: responseType === 'resolved' ? 'resolved' : 'in_progress',
      lastResponse: {
        type: responseType,
        responderId: responderId || responderUserId,
        notes: notes || '',
        timestamp: admin.firestore.FieldValue.serverTimestamp()
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create response record
    await db.collection('emergencyResponses').add({
      alertId,
      responderId: responderId || responderUserId,
      responseType,
      notes: notes || '',
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send notification to user if resolved
    if (responseType === 'resolved') {
      await db.collection('notifications').add({
        userId: alertData?.userId,
        type: 'emergency_resolved',
        title: 'Emergency Resolved',
        message: 'Your emergency alert has been resolved',
        data: {
          alertId,
          responseType
        },
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    // Log the response
    await db.collection('auditLogs').add({
      userId: responderUserId,
      action: 'EMERGENCY_RESPONSE_PROCESSED',
      details: {
        alertId,
        responseType,
        notes,
        targetUserId: alertData?.userId
      },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      ipAddress: context.rawRequest.ip
    });

    return { success: true, message: 'Emergency response processed successfully' };
  } catch (error) {
    console.error('Error processing emergency response:', error);
    if (error instanceof functions.https.HttpsError) {
      throw error;
    }
    throw new functions.https.HttpsError('internal', 'Failed to process emergency response');
  }
};

// Helper function to determine emergency response
async function determineEmergencyResponse(
  severity: string,
  userData: any,
  elderlyProfileData: any
): Promise<string[]> {
  const actions: string[] = [];

  switch (severity) {
    case 'critical':
      actions.push('Immediate medical attention required');
      actions.push('Emergency services notified');
      actions.push('Family members contacted');
      break;
    case 'high':
      actions.push('Urgent medical attention recommended');
      actions.push('Caregiver notified');
      actions.push('Family members contacted');
      break;
    case 'medium':
      actions.push('Medical attention recommended');
      actions.push('Caregiver notified');
      break;
    case 'low':
      actions.push('Monitor situation');
      actions.push('Caregiver notified');
      break;
  }

  return actions;
}

// Helper function to send emergency notification
async function sendEmergencyNotification(
  alertData: EmergencyAlert,
  userData: any,
  elderlyProfileData: any
) {
  try {
    const message = `EMERGENCY ALERT: ${userData.displayName} has triggered a ${alertData.severity} ${alertData.type} emergency. Location: ${alertData.location?.address || 'Unknown'}`;

    // Create notification for emergency contact
    await db.collection('notifications').add({
      userId: alertData.userId,
      type: 'emergency_alert',
      title: 'Emergency Alert',
      message,
      data: {
        alertId: alertData.userId,
        type: alertData.type,
        severity: alertData.severity,
        location: alertData.location
      },
      isRead: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Send SMS to emergency contact (if SMS service is configured)
    if (elderlyProfileData?.emergencyContactPhone) {
      // TODO: Integrate with SMS service (Twilio, etc.)
      console.log(`SMS would be sent to ${elderlyProfileData.emergencyContactPhone}: ${message}`);
    }
  } catch (error) {
    console.error('Error sending emergency notification:', error);
  }
}

// Helper function to notify caregivers
async function notifyCaregivers(userId: string, alertData: EmergencyAlert, userData: any) {
  try {
    // Get caregivers for this user
    const caregiversSnapshot = await db.collection('caregiverRelationships')
      .where('elderlyProfileId', '==', userId)
      .get();

    for (const doc of caregiversSnapshot.docs) {
      const relationship = doc.data();
      const caregiverId = relationship.caregiverId;

      // Create notification for caregiver
      await db.collection('notifications').add({
        userId: caregiverId,
        type: 'emergency_alert',
        title: 'Emergency Alert - Your Patient',
        message: `${userData.displayName} has triggered a ${alertData.severity} ${alertData.type} emergency`,
        data: {
          patientId: userId,
          alertId: alertData.userId,
          type: alertData.type,
          severity: alertData.severity
        },
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error notifying caregivers:', error);
  }
}

// Helper function to notify healthcare providers
async function notifyHealthcareProviders(userId: string, alertData: EmergencyAlert, userData: any) {
  try {
    // Get healthcare providers for this user
    const providersSnapshot = await db.collection('healthcareProviders')
      .where('patientIds', 'array-contains', userId)
      .get();

    for (const doc of providersSnapshot.docs) {
      const provider = doc.data();

      // Create notification for healthcare provider
      await db.collection('notifications').add({
        userId: provider.userId,
        type: 'emergency_alert',
        title: 'Emergency Alert - Patient',
        message: `${userData.displayName} has triggered a ${alertData.severity} ${alertData.type} emergency`,
        data: {
          patientId: userId,
          alertId: alertData.userId,
          type: alertData.type,
          severity: alertData.severity
        },
        isRead: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error notifying healthcare providers:', error);
  }
}
