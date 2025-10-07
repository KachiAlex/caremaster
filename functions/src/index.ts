import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createUserProfile, updateUserProfile, deleteUserProfile } from './userManagement';
import { sendMedicationReminder, processMedicationLog } from './medicationManagement';
import { handleEmergencyAlert, processEmergencyResponse } from './emergencyManagement';
import { processAIVoiceCommand, generateHealthRecommendations } from './aiProcessing';
import { sendNotification, scheduleNotification } from './notificationService';
import { logAuditEvent, getAuditLogs } from './auditLogging';
import { createInstitution, createLicense, assignInstitutionAdmin, getLicenseStatus, setSuperAdminClaim, getInstitutions, getLicenses, updateInstitution, deleteInstitution, updateLicense, suspendLicense, activateLicense, migrateInstitutionLinks, getInstitutionAdmins } from './licensing';

// Initialize Firebase Admin
admin.initializeApp();

// User Management Functions
export const createUserProfileFunction = functions.auth.user().onCreate(createUserProfile);
export const updateUserProfileFunction = functions.https.onCall(updateUserProfile);
export const deleteUserProfileFunction = functions.auth.user().onDelete(deleteUserProfile);

// Medication Management Functions
export const medicationReminderScheduler = functions.pubsub
  .schedule('every 1 hours')
  .onRun(sendMedicationReminder);

export const processMedicationLogFunction = functions.https.onCall(processMedicationLog);

// Emergency Management Functions
export const emergencyAlertFunction = functions.https.onCall(handleEmergencyAlert);
export const emergencyResponseFunction = functions.https.onCall(processEmergencyResponse);

// AI Processing Functions
export const processVoiceCommandFunction = functions.https.onCall(processAIVoiceCommand);
export const generateHealthRecommendationsFunction = functions.https.onCall(generateHealthRecommendations);

// Notification Functions
export const sendNotificationFunction = functions.https.onCall(sendNotification);
export const scheduleNotificationFunction = functions.https.onCall(scheduleNotification);

// Audit Logging Functions
export const logAuditEventFunction = functions.https.onCall(logAuditEvent);
export const getAuditLogsFunction = functions.https.onCall(getAuditLogs);

// Health Check Function
export const healthCheck = functions.https.onRequest((req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'ElderX Firebase Functions',
    version: '1.0.0'
  });
});

// Licensing Functions
export const createInstitutionFunction = createInstitution;
export const createLicenseFunction = createLicense;
export const assignInstitutionAdminFunction = assignInstitutionAdmin;
export const getLicenseStatusFunction = getLicenseStatus;
export const setSuperAdminClaimFunction = setSuperAdminClaim;
export const getInstitutionsFunction = getInstitutions;
export const getLicensesFunction = getLicenses;
export const updateInstitutionFunction = updateInstitution;
export const deleteInstitutionFunction = deleteInstitution;
export const updateLicenseFunction = updateLicense;
export const suspendLicenseFunction = suspendLicense;
export const activateLicenseFunction = activateLicense;
export const migrateInstitutionLinksFunction = migrateInstitutionLinks;
export const getInstitutionAdminsFunction = getInstitutionAdmins;
