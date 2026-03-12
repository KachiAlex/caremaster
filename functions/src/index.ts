import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { createUserProfile, updateUserProfile, deleteUserProfile, deleteUser } from './userManagement';
import { sendMedicationReminder, processMedicationLog } from './medicationManagement';
import { handleEmergencyAlert, processEmergencyResponse } from './emergencyManagement';
import { processAIVoiceCommand, generateHealthRecommendations } from './aiProcessing';
import { sendNotification, scheduleNotification } from './notificationService';
import { logAuditEvent, getAuditLogs } from './auditLogging';
import { createInstitution, createLicense, assignInstitutionAdmin, getLicenseStatus, setSuperAdminClaim, getInstitutions, getLicenses, updateInstitution, deleteInstitution, updateLicense, suspendLicense, activateLicense, migrateInstitutionLinks, getInstitutionAdmins, removeInstitutionAdmin, resetSuperAdminPassword, deleteSuperAdmin } from './licensing';
import { createCaregiverWithAuth, resetCaregiverPassword } from './caregiverManagement';
import { createInstitutionUser } from './institutionUserManagement';

// Initialize Firebase Admin
admin.initializeApp();

const db = admin.firestore();

// User Management Functions
export const createUserProfileFunction = functions.auth.user().onCreate(createUserProfile);
export const updateUserProfileFunction = functions.https.onCall(updateUserProfile);
export const deleteUserProfileFunction = functions.auth.user().onDelete(deleteUserProfile);
export const deleteUserFunction = deleteUser;

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

// Caregiver Management Functions
export const createCaregiverWithAuthFunction = createCaregiverWithAuth;
export const resetCaregiverPasswordFunction = resetCaregiverPassword;

// Institution User Management Functions
export const createInstitutionUserFunction = createInstitutionUser;

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
export const removeInstitutionAdminFunction = removeInstitutionAdmin;
export const resetSuperAdminPasswordFunction = resetSuperAdminPassword;
export const deleteSuperAdminFunction = deleteSuperAdmin;

// User Role Migration Function
export const migrateUserRoles = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    res.set('Access-Control-Allow-Methods', 'GET, POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.status(204).send('');
    return;
  }
  
  try {
    console.log('Starting user role migration...');
    
    const usersSnapshot = await db.collection('users').get();
    
    const results = {
      total: usersSnapshot.size,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: [] as any[]
    };
    
    const batch = db.batch();
    let batchCount = 0;
    
    for (const doc of usersSnapshot.docs) {
      const userData = doc.data();
      
      // Skip if already migrated
      if (userData.roleMigrated) {
        results.skipped++;
        continue;
      }
      
      try {
        // Infer role from existing data
        let inferredRole = 'caregiver';
        
        if (userData.email === 'superadmin@Care Master.com') {
          inferredRole = 'super-admin';
        } else if (userData.role) {
          inferredRole = userData.role;
        } else if (userData.userType) {
          inferredRole = userData.userType === 'elderly' ? 'elderly' : userData.userType;
        } else if (userData.type) {
          inferredRole = userData.type === 'elderly' ? 'elderly' : userData.type;
        } else if (userData.medicalQualification) {
          const qual = userData.medicalQualification.toLowerCase();
          if (qual.includes('doctor') || qual.includes('md')) inferredRole = 'doctor';
          else if (qual.includes('nurse')) inferredRole = 'nurse';
          else if (qual.includes('pharmacist')) inferredRole = 'pharmacist';
        }
        
        const userRef = db.collection('users').doc(doc.id);
        batch.update(userRef, {
          role: inferredRole,
          roleMigrated: true,
          roleMigratedAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        results.details.push({
          userId: doc.id,
          email: userData.email || doc.id,
          newRole: inferredRole
        });
        
        results.migrated++;
        batchCount++;
        
      } catch (error: any) {
        console.error(`Error migrating user ${doc.id}:`, error);
        results.errors++;
      }
    }
    
    if (batchCount > 0) {
      await batch.commit();
    }
    
    console.log('Migration complete:', results);
    res.status(200).json(results);
    
  } catch (error: any) {
    console.error('Migration failed:', error);
    res.status(500).json({ error: error.message });
  }
});
