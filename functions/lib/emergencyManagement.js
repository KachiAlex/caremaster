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
exports.processEmergencyResponse = exports.handleEmergencyAlert = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const getDb = () => admin.firestore();
// Handle emergency alert
const handleEmergencyAlert = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { type, severity, location, description } = data;
        const userId = context.auth.uid;
        const timestamp = admin.firestore.Timestamp.now();
        // Get user profile and emergency contacts
        const userDoc = await getDb().collection('users').doc(userId).get();
        const elderlyProfileDoc = await getDb().collection('elderlyProfiles').doc(userId).get();
        if (!userDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'User profile not found');
        }
        const userData = userDoc.data();
        const elderlyProfileData = elderlyProfileDoc.exists ? elderlyProfileDoc.data() : null;
        // Create emergency alert record
        const alertData = {
            userId,
            type,
            severity,
            location,
            description,
            timestamp
        };
        const alertRef = await getDb().collection('emergencyAlerts').add(Object.assign(Object.assign({}, alertData), { status: 'active', createdAt: admin.firestore.FieldValue.serverTimestamp() }));
        // Determine response based on severity
        const responseActions = await determineEmergencyResponse(severity, userData, elderlyProfileData);
        // Send notifications to emergency contacts
        if (elderlyProfileData === null || elderlyProfileData === void 0 ? void 0 : elderlyProfileData.emergencyContactPhone) {
            await sendEmergencyNotification(alertData, userData, elderlyProfileData);
        }
        // Send notifications to caregivers
        await notifyCaregivers(userId, alertData, userData);
        // Send notifications to healthcare providers if critical
        if (severity === 'critical' || severity === 'high') {
            await notifyHealthcareProviders(userId, alertData, userData);
        }
        // Log the emergency
        await getDb().collection('auditLogs').add({
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
    }
    catch (error) {
        console.error('Error handling emergency alert:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process emergency alert');
    }
};
exports.handleEmergencyAlert = handleEmergencyAlert;
// Process emergency response
const processEmergencyResponse = async (data, context) => {
    try {
        // Verify authentication
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }
        const { alertId, responseType, notes, responderId } = data;
        const responderUserId = context.auth.uid;
        // Get the emergency alert
        const alertDoc = await getDb().collection('emergencyAlerts').doc(alertId).get();
        if (!alertDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Emergency alert not found');
        }
        const alertData = alertDoc.data();
        // Update alert status
        await getDb().collection('emergencyAlerts').doc(alertId).update({
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
        await getDb().collection('emergencyResponses').add({
            alertId,
            responderId: responderId || responderUserId,
            responseType,
            notes: notes || '',
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        // Send notification to user if resolved
        if (responseType === 'resolved') {
            await getDb().collection('notifications').add({
                userId: alertData === null || alertData === void 0 ? void 0 : alertData.userId,
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
        await getDb().collection('auditLogs').add({
            userId: responderUserId,
            action: 'EMERGENCY_RESPONSE_PROCESSED',
            details: {
                alertId,
                responseType,
                notes,
                targetUserId: alertData === null || alertData === void 0 ? void 0 : alertData.userId
            },
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            ipAddress: context.rawRequest.ip
        });
        return { success: true, message: 'Emergency response processed successfully' };
    }
    catch (error) {
        console.error('Error processing emergency response:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', 'Failed to process emergency response');
    }
};
exports.processEmergencyResponse = processEmergencyResponse;
// Helper function to determine emergency response
async function determineEmergencyResponse(severity, userData, elderlyProfileData) {
    const actions = [];
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
async function sendEmergencyNotification(alertData, userData, elderlyProfileData) {
    var _a;
    try {
        const message = `EMERGENCY ALERT: ${userData.displayName} has triggered a ${alertData.severity} ${alertData.type} emergency. Location: ${((_a = alertData.location) === null || _a === void 0 ? void 0 : _a.address) || 'Unknown'}`;
        // Create notification for emergency contact
        await getDb().collection('notifications').add({
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
        if (elderlyProfileData === null || elderlyProfileData === void 0 ? void 0 : elderlyProfileData.emergencyContactPhone) {
            // TODO: Integrate with SMS service (Twilio, etc.)
            console.log(`SMS would be sent to ${elderlyProfileData.emergencyContactPhone}: ${message}`);
        }
    }
    catch (error) {
        console.error('Error sending emergency notification:', error);
    }
}
// Helper function to notify caregivers
async function notifyCaregivers(userId, alertData, userData) {
    try {
        // Get caregivers for this user
        const caregiversSnapshot = await getDb().collection('caregiverRelationships')
            .where('elderlyProfileId', '==', userId)
            .get();
        for (const doc of caregiversSnapshot.docs) {
            const relationship = doc.data();
            const caregiverId = relationship.caregiverId;
            // Create notification for caregiver
            await getDb().collection('notifications').add({
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
    }
    catch (error) {
        console.error('Error notifying caregivers:', error);
    }
}
// Helper function to notify healthcare providers
async function notifyHealthcareProviders(userId, alertData, userData) {
    try {
        // Get healthcare providers for this user
        const providersSnapshot = await getDb().collection('healthcareProviders')
            .where('patientIds', 'array-contains', userId)
            .get();
        for (const doc of providersSnapshot.docs) {
            const provider = doc.data();
            // Create notification for healthcare provider
            await getDb().collection('notifications').add({
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
    }
    catch (error) {
        console.error('Error notifying healthcare providers:', error);
    }
}
//# sourceMappingURL=emergencyManagement.js.map