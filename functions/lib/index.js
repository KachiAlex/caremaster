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
exports.removeInstitutionAdminFunction = exports.getInstitutionAdminsFunction = exports.migrateInstitutionLinksFunction = exports.activateLicenseFunction = exports.suspendLicenseFunction = exports.updateLicenseFunction = exports.deleteInstitutionFunction = exports.updateInstitutionFunction = exports.getLicensesFunction = exports.getInstitutionsFunction = exports.setSuperAdminClaimFunction = exports.getLicenseStatusFunction = exports.assignInstitutionAdminFunction = exports.createLicenseFunction = exports.createInstitutionFunction = exports.createCaregiverWithAuthFunction = exports.healthCheck = exports.getAuditLogsFunction = exports.logAuditEventFunction = exports.scheduleNotificationFunction = exports.sendNotificationFunction = exports.generateHealthRecommendationsFunction = exports.processVoiceCommandFunction = exports.emergencyResponseFunction = exports.emergencyAlertFunction = exports.processMedicationLogFunction = exports.medicationReminderScheduler = exports.deleteUserProfileFunction = exports.updateUserProfileFunction = exports.createUserProfileFunction = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const userManagement_1 = require("./userManagement");
const medicationManagement_1 = require("./medicationManagement");
const emergencyManagement_1 = require("./emergencyManagement");
const aiProcessing_1 = require("./aiProcessing");
const notificationService_1 = require("./notificationService");
const auditLogging_1 = require("./auditLogging");
const licensing_1 = require("./licensing");
const caregiverManagement_1 = require("./caregiverManagement");
// Initialize Firebase Admin
admin.initializeApp();
// User Management Functions
exports.createUserProfileFunction = functions.auth.user().onCreate(userManagement_1.createUserProfile);
exports.updateUserProfileFunction = functions.https.onCall(userManagement_1.updateUserProfile);
exports.deleteUserProfileFunction = functions.auth.user().onDelete(userManagement_1.deleteUserProfile);
// Medication Management Functions
exports.medicationReminderScheduler = functions.pubsub
    .schedule('every 1 hours')
    .onRun(medicationManagement_1.sendMedicationReminder);
exports.processMedicationLogFunction = functions.https.onCall(medicationManagement_1.processMedicationLog);
// Emergency Management Functions
exports.emergencyAlertFunction = functions.https.onCall(emergencyManagement_1.handleEmergencyAlert);
exports.emergencyResponseFunction = functions.https.onCall(emergencyManagement_1.processEmergencyResponse);
// AI Processing Functions
exports.processVoiceCommandFunction = functions.https.onCall(aiProcessing_1.processAIVoiceCommand);
exports.generateHealthRecommendationsFunction = functions.https.onCall(aiProcessing_1.generateHealthRecommendations);
// Notification Functions
exports.sendNotificationFunction = functions.https.onCall(notificationService_1.sendNotification);
exports.scheduleNotificationFunction = functions.https.onCall(notificationService_1.scheduleNotification);
// Audit Logging Functions
exports.logAuditEventFunction = functions.https.onCall(auditLogging_1.logAuditEvent);
exports.getAuditLogsFunction = functions.https.onCall(auditLogging_1.getAuditLogs);
// Health Check Function
exports.healthCheck = functions.https.onRequest((req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        service: 'ElderX Firebase Functions',
        version: '1.0.0'
    });
});
// Caregiver Management Functions
exports.createCaregiverWithAuthFunction = caregiverManagement_1.createCaregiverWithAuth;
// Licensing Functions
exports.createInstitutionFunction = licensing_1.createInstitution;
exports.createLicenseFunction = licensing_1.createLicense;
exports.assignInstitutionAdminFunction = licensing_1.assignInstitutionAdmin;
exports.getLicenseStatusFunction = licensing_1.getLicenseStatus;
exports.setSuperAdminClaimFunction = licensing_1.setSuperAdminClaim;
exports.getInstitutionsFunction = licensing_1.getInstitutions;
exports.getLicensesFunction = licensing_1.getLicenses;
exports.updateInstitutionFunction = licensing_1.updateInstitution;
exports.deleteInstitutionFunction = licensing_1.deleteInstitution;
exports.updateLicenseFunction = licensing_1.updateLicense;
exports.suspendLicenseFunction = licensing_1.suspendLicense;
exports.activateLicenseFunction = licensing_1.activateLicense;
exports.migrateInstitutionLinksFunction = licensing_1.migrateInstitutionLinks;
exports.getInstitutionAdminsFunction = licensing_1.getInstitutionAdmins;
exports.removeInstitutionAdminFunction = licensing_1.removeInstitutionAdmin;
//# sourceMappingURL=index.js.map