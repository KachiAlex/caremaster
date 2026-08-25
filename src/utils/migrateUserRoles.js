/**
 * User Role Migration Utility
 * 
 * This script migrates existing users to use the standardized 'role' field.
 * It should be run once to clean up the database.
 * 
 * Usage:
 * - Import this in a component (e.g., SuperAdminDashboard)
 * - Call migrateAllUsers() when needed
 * - Or use the standalone HTML file for one-time migration
 */

import { collection, getDocs, doc, updateDoc, writeBatch } from 'backend/database';
import { db } from '../backend/config';
import { ROLES } from '../constants/roles';

/**
 * Infer role from user profile data
 */
const inferRole = (userData) => {
  // Priority 1: Explicit role field
  if (userData.role) return userData.role;
  
  // Priority 2: userType
  if (userData.userType) return userData.userType;
  
  // Priority 3: type
  if (userData.type) return userData.type;
  
  // Priority 4: Infer from medicalQualification
  if (userData.medicalQualification) {
    const qual = userData.medicalQualification.toLowerCase();
    if (qual.includes('doctor') || qual.includes('md')) return ROLES.DOCTOR;
    if (qual.includes('nurse') || qual.includes('rn') || qual.includes('lpn')) return ROLES.NURSE;
    if (qual.includes('pharmacist')) return ROLES.PHARMACIST;
    if (qual.includes('physio')) return ROLES.PHYSIOTHERAPIST;
    if (qual.includes('psycho')) return ROLES.PSYCHOLOGIST;
    if (qual.includes('lab')) return ROLES.LAB_TECHNICIAN;
  }
  
  // Default: caregiver
  return ROLES.CAREGIVER;
};

/**
 * Migrate a single user document
 */
export const migrateUser = async (userId, userData) => {
  try {
    const inferredRole = inferRole(userData);
    
    // Update the user document
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      role: inferredRole,
      updatedAt: new Date().toISOString(),
      roleMigrated: true,
      roleMigratedAt: new Date().toISOString()
    });
    
    console.log(`✅ Migrated user ${userId}: ${userData.email || userData.name} → ${inferredRole}`);
    return { success: true, userId, role: inferredRole };
  } catch (error) {
    console.error(`❌ Error migrating user ${userId}:`, error);
    return { success: false, userId, error: error.message };
  }
};

/**
 * Migrate all users in batches
 */
export const migrateAllUsers = async (options = {}) => {
  const {
    dryRun = false, // If true, only logs what would be changed without updating
    batchSize = 50 // Number of users to process in each batch
  } = options;
  
  try {
    console.log('🔄 Starting user role migration...');
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE UPDATE'}`);
    
    // Fetch all users
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const totalUsers = usersSnapshot.size;
    
    console.log(`📊 Found ${totalUsers} users to process`);
    
    const results = {
      total: totalUsers,
      migrated: 0,
      skipped: 0,
      errors: 0,
      details: []
    };
    
    // Process users
    const users = [];
    usersSnapshot.forEach(doc => {
      users.push({ id: doc.id, data: doc.data() });
    });
    
    // Process in batches
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = writeBatch(db);
      const batchUsers = users.slice(i, i + batchSize);
      
      console.log(`\n📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(users.length / batchSize)}...`);
      
      for (const { id, data } of batchUsers) {
        const inferredRole = inferRole(data);
        
        // Check if migration is needed
        if (data.role && data.roleMigrated) {
          console.log(`⏭️  Skipping ${id} (${data.email || data.name}): already migrated`);
          results.skipped++;
          continue;
        }
        
        const migrationData = {
          role: inferredRole,
          updatedAt: new Date().toISOString(),
          roleMigrated: true,
          roleMigratedAt: new Date().toISOString()
        };
        
        if (dryRun) {
          console.log(`🔍 [DRY RUN] Would migrate ${id}:`);
          console.log(`   Email: ${data.email || 'N/A'}`);
          console.log(`   Name: ${data.name || 'N/A'}`);
          console.log(`   Current role: ${data.role || 'none'}`);
          console.log(`   Current userType: ${data.userType || 'none'}`);
          console.log(`   Current type: ${data.type || 'none'}`);
          console.log(`   → New role: ${inferredRole}`);
          results.migrated++;
        } else {
          try {
            const userRef = doc(db, 'users', id);
            batch.update(userRef, migrationData);
            
            results.details.push({
              userId: id,
              email: data.email,
              oldRole: data.role,
              newRole: inferredRole,
              success: true
            });
            
            console.log(`✅ Queued ${id}: ${data.email || data.name} → ${inferredRole}`);
            results.migrated++;
          } catch (error) {
            console.error(`❌ Error queuing ${id}:`, error);
            results.errors++;
            results.details.push({
              userId: id,
              email: data.email,
              error: error.message,
              success: false
            });
          }
        }
      }
      
      // Commit batch if not dry run
      if (!dryRun && batchUsers.length > 0) {
        try {
          await batch.commit();
          console.log(`✅ Batch ${Math.floor(i / batchSize) + 1} committed successfully`);
        } catch (error) {
          console.error(`❌ Error committing batch ${Math.floor(i / batchSize) + 1}:`, error);
          results.errors += batchUsers.length;
        }
      }
    }
    
    // Summary
    console.log('\n═══════════════════════════════════════');
    console.log('📊 MIGRATION SUMMARY');
    console.log('═══════════════════════════════════════');
    console.log(`Total users: ${results.total}`);
    console.log(`Migrated: ${results.migrated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors}`);
    console.log('═══════════════════════════════════════\n');
    
    if (dryRun) {
      console.log('⚠️  This was a DRY RUN. No changes were made.');
      console.log('   Run with { dryRun: false } to apply changes.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
};

/**
 * Get migration status
 */
export const getMigrationStatus = async () => {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    let total = 0;
    let migrated = 0;
    let needsMigration = 0;
    
    usersSnapshot.forEach(doc => {
      total++;
      const data = doc.data();
      if (data.roleMigrated) {
        migrated++;
      } else {
        needsMigration++;
      }
    });
    
    return {
      total,
      migrated,
      needsMigration,
      percentComplete: total > 0 ? Math.round((migrated / total) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    throw error;
  }
};

export default {
  migrateUser,
  migrateAllUsers,
  getMigrationStatus,
  inferRole
};

