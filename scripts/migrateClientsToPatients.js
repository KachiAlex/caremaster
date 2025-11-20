/**
 * Migration Script: Clients to Patients
 * 
 * This script migrates existing client records from the 'clients' collection
 * to the 'patients' collection with generated patient IDs.
 * 
 * Usage:
 * 1. Run this script in a Node.js environment with Firebase Admin SDK
 * 2. Ensure you have proper Firebase credentials configured
 * 3. Review the migration plan before executing
 * 
 * IMPORTANT: Backup your database before running this script!
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin (adjust path to your service account key)
// const serviceAccount = JSON.parse(readFileSync(join(__dirname, '../path-to-service-account-key.json')));
// initializeApp({ credential: cert(serviceAccount) });

const db = getFirestore();

const CLIENTS_COLLECTION = 'clients';
const PATIENTS_COLLECTION = 'patients';
const PATIENT_LOGS_COLLECTION = 'patientLogs';

/**
 * Generate a patient ID for a client
 * Format: UC-YYYY-NNNN
 */
function generatePatientIdForClient(clientData, existingPatientIds) {
  const currentYear = new Date().getFullYear();
  const prefix = `UC-${currentYear}`;
  
  // Find the highest number for this year
  let maxNumber = 0;
  existingPatientIds.forEach(id => {
    if (id.startsWith(prefix)) {
      const parts = id.split('-');
      const number = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(number) && number > maxNumber) {
        maxNumber = number;
      }
    }
  });
  
  const nextNumber = maxNumber + 1;
  const formattedNumber = String(nextNumber).padStart(4, '0');
  return `${prefix}-${formattedNumber}`;
}

/**
 * Migrate a single client to patient
 */
async function migrateClientToPatient(clientDoc, patientId) {
  const clientData = clientDoc.data();
  
  // Prepare patient data
  const patientData = {
    ...clientData,
    patientId: patientId,
    registrationDate: clientData.createdAt || clientData.registrationDate || new Date(),
    registeredBy: clientData.createdBy || clientData.registeredBy || 'migration-script',
    migratedFrom: 'clients',
    migratedAt: new Date(),
    migratedClientId: clientDoc.id,
    status: clientData.status || 'active',
    createdAt: clientData.createdAt || new Date(),
    updatedAt: new Date()
  };

  // Remove any fields that shouldn't be in patients collection
  delete patientData.migratedFrom;
  delete patientData.migratedAt;
  delete patientData.migratedClientId;

  // Create patient document
  const patientRef = db.collection(PATIENTS_COLLECTION).doc();
  await patientRef.set(patientData);

  console.log(`✅ Migrated client ${clientDoc.id} → patient ${patientRef.id} with ID ${patientId}`);

  return {
    clientId: clientDoc.id,
    patientId: patientRef.id,
    patientSimpleId: patientId
  };
}

/**
 * Migrate patient logs to use new patient IDs
 */
async function migratePatientLogs(migrationMap) {
  console.log('\n📋 Migrating patient logs...');
  
  const logsSnapshot = await db.collection(PATIENT_LOGS_COLLECTION).get();
  let migratedCount = 0;

  for (const logDoc of logsSnapshot.docs) {
    const logData = logDoc.data();
    
    // Find the new patient ID for this log
    const migration = migrationMap.find(m => 
      m.clientId === logData.patientId || 
      m.oldPatientId === logData.patientId
    );

    if (migration) {
      await logDoc.ref.update({
        patientId: migration.patientSimpleId,
        migratedAt: new Date(),
        oldPatientId: logData.patientId
      });
      migratedCount++;
    }
  }

  console.log(`✅ Migrated ${migratedCount} log entries`);
}

/**
 * Main migration function
 */
async function migrateClientsToPatients(options = {}) {
  const {
    dryRun = true,
    batchSize = 50,
    institutionId = null
  } = options;

  console.log('🚀 Starting Client to Patient Migration');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (changes will be saved)'}`);
  console.log(`Batch Size: ${batchSize}`);
  if (institutionId) {
    console.log(`Institution Filter: ${institutionId}`);
  }
  console.log('');

  try {
    // Get all existing patient IDs to avoid conflicts
    console.log('📊 Fetching existing patient IDs...');
    const existingPatientsSnapshot = await db.collection(PATIENTS_COLLECTION).get();
    const existingPatientIds = [];
    existingPatientsSnapshot.forEach(doc => {
      const data = doc.data();
      if (data.patientId) {
        existingPatientIds.push(data.patientId);
      }
    });
    console.log(`Found ${existingPatientIds.length} existing patients`);

    // Get all clients
    console.log('\n📋 Fetching clients...');
    let clientsQuery = db.collection(CLIENTS_COLLECTION);
    
    if (institutionId) {
      clientsQuery = clientsQuery.where('institutionId', '==', institutionId);
    }
    
    const clientsSnapshot = await clientsQuery.get();
    console.log(`Found ${clientsSnapshot.size} clients to migrate`);

    if (clientsSnapshot.empty) {
      console.log('✅ No clients to migrate');
      return;
    }

    // Migration plan
    const migrationPlan = [];
    clientsSnapshot.forEach(doc => {
      const clientData = doc.data();
      const patientId = generatePatientIdForClient(clientData, existingPatientIds);
      existingPatientIds.push(patientId); // Add to list to avoid duplicates
      
      migrationPlan.push({
        clientId: doc.id,
        clientName: clientData.name || clientData.fullName || 'Unknown',
        patientId: patientId,
        institutionId: clientData.institutionId
      });
    });

    // Display migration plan
    console.log('\n📋 Migration Plan:');
    console.log('─'.repeat(80));
    migrationPlan.forEach((plan, index) => {
      console.log(`${index + 1}. ${plan.clientName} (${plan.clientId}) → ${plan.patientId}`);
    });
    console.log('─'.repeat(80));

    if (dryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made');
      console.log('To execute the migration, run with dryRun: false');
      return migrationPlan;
    }

    // Execute migration
    console.log('\n🔄 Executing migration...');
    const migrationMap = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < migrationPlan.length; i += batchSize) {
      const batch = migrationPlan.slice(i, i + batchSize);
      
      for (const plan of batch) {
        try {
          const clientDoc = await db.collection(CLIENTS_COLLECTION).doc(plan.clientId).get();
          
          if (!clientDoc.exists) {
            console.log(`⚠️  Client ${plan.clientId} not found, skipping`);
            errorCount++;
            continue;
          }

          const result = await migrateClientToPatient(clientDoc, plan.patientId);
          migrationMap.push({
            clientId: plan.clientId,
            patientId: result.patientId,
            patientSimpleId: result.patientSimpleId,
            oldPatientId: plan.clientId
          });
          successCount++;
        } catch (error) {
          console.error(`❌ Error migrating client ${plan.clientId}:`, error);
          errorCount++;
        }
      }

      console.log(`Progress: ${Math.min(i + batchSize, migrationPlan.length)}/${migrationPlan.length}`);
    }

    // Migrate patient logs
    if (migrationMap.length > 0) {
      await migratePatientLogs(migrationMap);
    }

    // Summary
    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${successCount}`);
    console.log(`❌ Errors: ${errorCount}`);
    console.log(`📋 Total: ${migrationPlan.length}`);

    // Save migration report
    const report = {
      timestamp: new Date(),
      totalClients: migrationPlan.length,
      successful: successCount,
      errors: errorCount,
      migrationMap: migrationMap
    };

    await db.collection('migrationReports').add({
      type: 'clients-to-patients',
      ...report
    });

    console.log('\n✅ Migration complete!');
    return report;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

/**
 * Validate migrated data
 */
async function validateMigration() {
  console.log('🔍 Validating migration...');

  const clientsCount = (await db.collection(CLIENTS_COLLECTION).get()).size;
  const patientsCount = (await db.collection(PATIENTS_COLLECTION).get()).size;
  const logsCount = (await db.collection(PATIENT_LOGS_COLLECTION).get()).size;

  console.log(`Clients: ${clientsCount}`);
  console.log(`Patients: ${patientsCount}`);
  console.log(`Patient Logs: ${logsCount}`);

  // Check for patients with patientId
  const patientsWithId = await db.collection(PATIENTS_COLLECTION)
    .where('patientId', '!=', null)
    .get();
  
  console.log(`Patients with patientId: ${patientsWithId.size}`);

  return {
    clientsCount,
    patientsCount,
    logsCount,
    patientsWithIdCount: patientsWithId.size
  };
}

// Export functions for use
export {
  migrateClientsToPatients,
  validateMigration,
  generatePatientIdForClient
};

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  // Example usage:
  // migrateClientsToPatients({ dryRun: true, institutionId: 'institution-123' })
  //   .then(() => validateMigration())
  //   .then(() => process.exit(0))
  //   .catch(error => {
  //     console.error('Migration failed:', error);
  //     process.exit(1);
  //   });
  
  console.log('Migration script loaded. Use migrateClientsToPatients() to run migration.');
}

