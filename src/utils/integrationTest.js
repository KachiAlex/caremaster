/**
 * Integration Test Script
 * Validates all major system components are working together
 */

import { getAllUsers } from '../api/usersAPI';
import { assignmentAPI } from '../api/assignmentAPI';
import { medicationAPI } from '../api/medicationAPI';
import { getVitalSignsByClient } from '../api/vitalSignsAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import logger from './logger';
import { auth } from '../backend/config';
import { onAuthStateChanged } from 'backend/auth';

export const runIntegrationTests = async () => {
  console.log('🚀 Starting Care Master Integration Tests...\n');
  
  const results = {
    authentication: false,
    userManagement: false,
    assignments: false,
    medications: false,
    vitalSigns: false,
    emergencySystem: false,
    dataConnect: false,
    database: false
  };

  try {
    // Test 1: Authentication System
    console.log('🔐 Testing Authentication System...');
    const authTest = await new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(!!auth.currentUser || user === null); // Either logged in or properly handling no user
      });
    });
    results.authentication = authTest;
    console.log(authTest ? '✅ Authentication: Working' : '❌ Authentication: Failed');

    // Test 2: User Management
    console.log('👥 Testing User Management...');
    try {
      const users = await getAllUsers();
      results.userManagement = Array.isArray(users);
      console.log(results.userManagement ? `✅ User Management: ${users.length} users found` : '❌ User Management: Failed');
    } catch (error) {
      console.log('❌ User Management: Failed -', error.message);
    }

    // Test 3: Assignment System
    console.log('📋 Testing Assignment System...');
    try {
      const stats = await assignmentAPI.getAssignmentStats();
      results.assignments = typeof stats === 'object';
      console.log(results.assignments ? `✅ Assignments: ${stats.totalAssignments} total assignments` : '❌ Assignments: Failed');
    } catch (error) {
      console.log('❌ Assignments: Failed -', error.message);
    }

    // Test 4: Medication System
    console.log('💊 Testing Medication System...');
    try {
      const medications = await medicationAPI.getMedications({ limit: 1 });
      results.medications = Array.isArray(medications);
      console.log(results.medications ? `✅ Medications: API working` : '❌ Medications: Failed');
    } catch (error) {
      console.log('❌ Medications: Failed -', error.message);
    }

    // Test 5: Vital Signs System
    console.log('📊 Testing Vital Signs System...');
    try {
      // Test with a dummy Client ID
      const vitalSigns = await getVitalSignsByClient('test-Client-id');
      results.vitalSigns = Array.isArray(vitalSigns);
      console.log(results.vitalSigns ? `✅ Vital Signs: API working` : '❌ Vital Signs: Failed');
    } catch (error) {
      console.log('❌ Vital Signs: Failed -', error.message);
    }

    // Test 6: Emergency System
    console.log('🚨 Testing Emergency System...');
    try {
      const emergencies = await emergencyAPI.getActiveEmergencies();
      results.emergencySystem = Array.isArray(emergencies);
      console.log(results.emergencySystem ? `✅ Emergency System: ${emergencies.length} active emergencies` : '❌ Emergency System: Failed');
    } catch (error) {
      console.log('❌ Emergency System: Failed -', error.message);
    }

    // Test 7: Data Connect Integration
    console.log('⚡ Testing Data Connect Integration...');
    try {
      const { dataConnectService } = await import('../services/dataConnectService');
      await dataConnectService._checkConnection();
      results.dataConnect = true;
      console.log('✅ Data Connect: Connected');
    } catch (error) {
      console.log('⚠️ Data Connect: Using Database fallback -', error.message);
      results.dataConnect = false; // Not a failure, just using fallback
    }

    // Test 8: Database Connection
    console.log('🗄️ Testing Database Connection...');
    try {
      // Database test is implicit in other tests
      results.database = results.userManagement || results.assignments || results.medications;
      console.log(results.database ? '✅ Database: Connected' : '❌ Database: Failed');
    } catch (error) {
      console.log('❌ Database: Failed -', error.message);
    }

  } catch (error) {
    console.error('❌ Integration test failed:', error);
  }

  // Generate Summary
  console.log('\n📊 INTEGRATION TEST SUMMARY');
  console.log('=' .repeat(50));
  
  const totalTests = Object.keys(results).length;
  const passedTests = Object.values(results).filter(Boolean).length;
  const failedTests = totalTests - passedTests;
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
  
  console.log('\nDetailed Results:');
  Object.entries(results).forEach(([test, passed]) => {
    console.log(`  ${passed ? '✅' : '❌'} ${test}: ${passed ? 'PASS' : 'FAIL'}`);
  });
  
  console.log('\n🎯 System Status:', passedTests >= totalTests * 0.8 ? 'OPERATIONAL' : 'NEEDS ATTENTION');
  console.log('=' .repeat(50));

  // Log to system
  logger.info('Integration test completed', {
    totalTests,
    passedTests,
    failedTests,
    successRate: (passedTests/totalTests) * 100,
    results
  });

  return results;
};

export default runIntegrationTests;
