/**
 * Data Migration Utilities
 * 
 * Tools for migrating legacy data to new structures:
 * - Clients → Patients migration
 * - Patient ID generation for existing records
 * - Data validation and cleanup
 * - Duplicate detection and merging
 * - Migration reporting
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  setDoc,
  query,
  where,
  orderBy,
  writeBatch,
  serverTimestamp,
  Timestamp
} from 'firebase/firestore';
import { db } from '../firebase/config';
import { generatePatientId } from './patientIdGenerator';

const PATIENTS_COLLECTION = 'patients';
const LEGACY_CLIENTS_COLLECTION = 'clients';
const MIGRATION_LOGS_COLLECTION = 'migrationLogs';

/**
 * Migration API
 */
export const migrationAPI = {
  /**
   * Migrate clients to patients collection
   */
  migrateClientsToPatients: async (institutionId, options = {}) => {
    const {
      dryRun = false,
      batchSize = 50,
      generatePatientIds = true,
      preserveLegacyData = true
    } = options;

    try {
      const migrationLog = {
        institutionId,
        type: 'clients_to_patients',
        status: 'in_progress',
        startedAt: serverTimestamp(),
        options,
        stats: {
          total: 0,
          migrated: 0,
          skipped: 0,
          errors: 0
        },
        errors: []
      };

      const logRef = await addDoc(collection(db, MIGRATION_LOGS_COLLECTION), migrationLog);
      const logId = logRef.id;

      // Get all clients for the institution
      const clientsRef = collection(db, LEGACY_CLIENTS_COLLECTION);
      let clientsQuery = query(clientsRef);
      
      if (institutionId) {
        clientsQuery = query(clientsRef, where('institutionId', '==', institutionId));
      }

      const clientsSnapshot = await getDocs(clientsQuery);
      const clients = [];
      clientsSnapshot.forEach((doc) => {
        clients.push({ id: doc.id, ...doc.data() });
      });

      migrationLog.stats.total = clients.length;

      // Process in batches
      for (let i = 0; i < clients.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchClients = clients.slice(i, i + batchSize);

        for (const client of batchClients) {
          try {
            // Check if patient already exists
            const existingPatient = await checkExistingPatient(client, institutionId);
            
            if (existingPatient && !options.force) {
              migrationLog.stats.skipped++;
              continue;
            }

            // Generate patient ID if needed
            let patientId = client.patientId;
            if (!patientId && generatePatientIds) {
              patientId = await generatePatientIdForClient(client, institutionId);
            }

            // Prepare patient data
            const patientData = {
              ...client,
              patientId: patientId || client.id,
              name: client.name || client.fullName || client.clientName,
              fullName: client.fullName || client.name || client.clientName,
              institutionId: client.institutionId || institutionId,
              status: client.status || 'active',
              registrationDate: client.createdAt || client.registrationDate || serverTimestamp(),
              createdAt: client.createdAt || serverTimestamp(),
              updatedAt: serverTimestamp(),
              migratedFrom: 'clients',
              migratedAt: serverTimestamp(),
              legacyClientId: client.id
            };

            if (!dryRun) {
              // Create patient document
              const patientRef = doc(collection(db, PATIENTS_COLLECTION));
              batch.set(patientRef, patientData);

              // Update legacy client with migration reference if preserving
              if (preserveLegacyData) {
                const legacyClientRef = doc(db, LEGACY_CLIENTS_COLLECTION, client.id);
                batch.update(legacyClientRef, {
                  migratedTo: patientRef.id,
                  migratedAt: serverTimestamp(),
                  migrationStatus: 'migrated'
                });
              }

              migrationLog.stats.migrated++;
            } else {
              migrationLog.stats.migrated++; // Count for dry run
            }
          } catch (error) {
            console.error(`Error migrating client ${client.id}:`, error);
            migrationLog.stats.errors++;
            migrationLog.errors.push({
              clientId: client.id,
              error: error.message
            });
          }
        }

        if (!dryRun) {
          await batch.commit();
        }

        // Update migration log progress
        await updateDoc(doc(db, MIGRATION_LOGS_COLLECTION, logId), {
          stats: migrationLog.stats,
          errors: migrationLog.errors,
          updatedAt: serverTimestamp()
        });
      }

      // Mark migration as complete
      await updateDoc(doc(db, MIGRATION_LOGS_COLLECTION, logId), {
        status: dryRun ? 'dry_run_complete' : 'completed',
        completedAt: serverTimestamp()
      });

      return {
        logId,
        ...migrationLog.stats,
        dryRun
      };
    } catch (error) {
      console.error('Error in migration:', error);
      throw error;
    }
  },

  /**
   * Generate patient IDs for existing patients without IDs
   */
  generatePatientIdsForExisting: async (institutionId, options = {}) => {
    const { dryRun = false, batchSize = 50 } = options;

    try {
      const patientsRef = collection(db, PATIENTS_COLLECTION);
      let patientsQuery = query(patientsRef);
      
      if (institutionId) {
        patientsQuery = query(patientsRef, where('institutionId', '==', institutionId));
      }

      const snapshot = await getDocs(patientsQuery);
      const patientsWithoutIds = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        if (!data.patientId) {
          patientsWithoutIds.push({ id: doc.id, ...data });
        }
      });

      const stats = {
        total: patientsWithoutIds.length,
        updated: 0,
        errors: 0
      };

      // Process in batches
      for (let i = 0; i < patientsWithoutIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const batchPatients = patientsWithoutIds.slice(i, i + batchSize);

        for (const patient of batchPatients) {
          try {
            const patientId = await generatePatientIdForClient(patient, institutionId);
            
            if (!dryRun) {
              const patientRef = doc(db, PATIENTS_COLLECTION, patient.id);
              batch.update(patientRef, {
                patientId,
                updatedAt: serverTimestamp()
              });
            }

            stats.updated++;
          } catch (error) {
            console.error(`Error generating ID for patient ${patient.id}:`, error);
            stats.errors++;
          }
        }

        if (!dryRun) {
          await batch.commit();
        }
      }

      return stats;
    } catch (error) {
      console.error('Error generating patient IDs:', error);
      throw error;
    }
  },

  /**
   * Validate and clean patient data
   */
  validateAndCleanPatientData: async (institutionId) => {
    try {
      const patientsRef = collection(db, PATIENTS_COLLECTION);
      let patientsQuery = query(patientsRef);
      
      if (institutionId) {
        patientsQuery = query(patientsRef, where('institutionId', '==', institutionId));
      }

      const snapshot = await getDocs(patientsQuery);
      const issues = {
        missingRequiredFields: [],
        invalidDates: [],
        duplicateEmails: [],
        duplicatePhones: [],
        invalidPatientIds: []
      };

      const emailMap = new Map();
      const phoneMap = new Map();

      snapshot.forEach((doc) => {
        const data = doc.data();
        const patientId = doc.id;

        // Check required fields
        if (!data.name && !data.fullName) {
          issues.missingRequiredFields.push({ id: patientId, field: 'name' });
        }

        if (!data.institutionId) {
          issues.missingRequiredFields.push({ id: patientId, field: 'institutionId' });
        }

        // Check dates
        if (data.dateOfBirth) {
          const dob = data.dateOfBirth?.toDate?.() || new Date(data.dateOfBirth);
          if (isNaN(dob.getTime()) || dob > new Date()) {
            issues.invalidDates.push({ id: patientId, field: 'dateOfBirth', value: data.dateOfBirth });
          }
        }

        // Check duplicates
        if (data.email) {
          if (emailMap.has(data.email)) {
            issues.duplicateEmails.push({ id: patientId, email: data.email, duplicateOf: emailMap.get(data.email) });
          } else {
            emailMap.set(data.email, patientId);
          }
        }

        if (data.phone || data.phoneNumber) {
          const phone = data.phone || data.phoneNumber;
          if (phoneMap.has(phone)) {
            issues.duplicatePhones.push({ id: patientId, phone, duplicateOf: phoneMap.get(phone) });
          } else {
            phoneMap.set(phone, patientId);
          }
        }

        // Check patient ID format
        if (data.patientId && !/^UC-\d{4}-\d{4}$/.test(data.patientId)) {
          issues.invalidPatientIds.push({ id: patientId, patientId: data.patientId });
        }
      });

      return {
        totalPatients: snapshot.size,
        issues,
        summary: {
          totalIssues: Object.values(issues).reduce((sum, arr) => sum + arr.length, 0),
          missingFields: issues.missingRequiredFields.length,
          invalidDates: issues.invalidDates.length,
          duplicates: issues.duplicateEmails.length + issues.duplicatePhones.length,
          invalidIds: issues.invalidPatientIds.length
        }
      };
    } catch (error) {
      console.error('Error validating patient data:', error);
      throw error;
    }
  },

  /**
   * Find and merge duplicate patients
   */
  findDuplicatePatients: async (institutionId, criteria = ['email', 'phone', 'name']) => {
    try {
      const patientsRef = collection(db, PATIENTS_COLLECTION);
      let patientsQuery = query(patientsRef);
      
      if (institutionId) {
        patientsQuery = query(patientsRef, where('institutionId', '==', institutionId));
      }

      const snapshot = await getDocs(patientsQuery);
      const patients = [];
      snapshot.forEach((doc) => {
        patients.push({ id: doc.id, ...doc.data() });
      });

      const duplicates = [];
      const processed = new Set();

      for (let i = 0; i < patients.length; i++) {
        if (processed.has(patients[i].id)) continue;

        const group = [patients[i]];
        processed.add(patients[i].id);

        for (let j = i + 1; j < patients.length; j++) {
          if (processed.has(patients[j].id)) continue;

          let isDuplicate = false;

          // Check email
          if (criteria.includes('email') && patients[i].email && patients[j].email) {
            if (patients[i].email.toLowerCase() === patients[j].email.toLowerCase()) {
              isDuplicate = true;
            }
          }

          // Check phone
          if (criteria.includes('phone') && !isDuplicate) {
            const phone1 = (patients[i].phone || patients[i].phoneNumber || '').replace(/\D/g, '');
            const phone2 = (patients[j].phone || patients[j].phoneNumber || '').replace(/\D/g, '');
            if (phone1 && phone2 && phone1 === phone2) {
              isDuplicate = true;
            }
          }

          // Check name similarity
          if (criteria.includes('name') && !isDuplicate) {
            const name1 = (patients[i].name || patients[i].fullName || '').toLowerCase().trim();
            const name2 = (patients[j].name || patients[j].fullName || '').toLowerCase().trim();
            if (name1 && name2 && calculateNameSimilarity(name1, name2) > 0.85) {
              isDuplicate = true;
            }
          }

          if (isDuplicate) {
            group.push(patients[j]);
            processed.add(patients[j].id);
          }
        }

        if (group.length > 1) {
          duplicates.push(group);
        }
      }

      return duplicates;
    } catch (error) {
      console.error('Error finding duplicates:', error);
      throw error;
    }
  },

  /**
   * Get migration history
   */
  getMigrationHistory: async (institutionId, limitCount = 10) => {
    try {
      const logsRef = collection(db, MIGRATION_LOGS_COLLECTION);
      let logsQuery = query(logsRef, orderBy('startedAt', 'desc'), limit(limitCount));
      
      if (institutionId) {
        logsQuery = query(logsRef, where('institutionId', '==', institutionId), orderBy('startedAt', 'desc'), limit(limitCount));
      }

      const snapshot = await getDocs(logsQuery);
      const migrations = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        migrations.push({
          id: doc.id,
          ...data,
          startedAt: data.startedAt?.toDate?.() || data.startedAt,
          completedAt: data.completedAt?.toDate?.() || data.completedAt
        });
      });

      return migrations;
    } catch (error) {
      console.error('Error fetching migration history:', error);
      throw error;
    }
  }
};

/**
 * Helper Functions
 */

const checkExistingPatient = async (client, institutionId) => {
  try {
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    
    // Check by email
    if (client.email) {
      const emailQuery = query(
        patientsRef,
        where('institutionId', '==', institutionId),
        where('email', '==', client.email)
      );
      const emailSnapshot = await getDocs(emailQuery);
      if (!emailSnapshot.empty) {
        return { id: emailSnapshot.docs[0].id, ...emailSnapshot.docs[0].data() };
      }
    }

    // Check by legacy client ID
    const legacyQuery = query(
      patientsRef,
      where('institutionId', '==', institutionId),
      where('legacyClientId', '==', client.id)
    );
    const legacySnapshot = await getDocs(legacyQuery);
    if (!legacySnapshot.empty) {
      return { id: legacySnapshot.docs[0].id, ...legacySnapshot.docs[0].data() };
    }

    return null;
  } catch (error) {
    console.error('Error checking existing patient:', error);
    return null;
  }
};

const generatePatientIdForClient = async (client, institutionId) => {
  try {
    // Get existing patient IDs to avoid duplicates
    const patientsRef = collection(db, PATIENTS_COLLECTION);
    const patientsQuery = query(patientsRef, where('institutionId', '==', institutionId));
    const snapshot = await getDocs(patientsQuery);
    
    const existingIds = new Set();
    snapshot.forEach((doc) => {
      const patientId = doc.data().patientId;
      if (patientId) {
        existingIds.add(patientId);
      }
    });

    // Generate new ID
    return await generatePatientId(institutionId, existingIds);
  } catch (error) {
    console.error('Error generating patient ID:', error);
    throw error;
  }
};

const calculateNameSimilarity = (name1, name2) => {
  // Simple Levenshtein distance-based similarity
  const longer = name1.length > name2.length ? name1 : name2;
  const shorter = name1.length > name2.length ? name2 : name1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
};

const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
};

export default migrationAPI;

