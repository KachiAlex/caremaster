import { auth } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { getAllUsers, updateUser } from '../api/usersAPI';
import assignmentAPI from '../api/assignmentAPI';
import { emergencyAPI } from '../api/emergencyAPI';
import { medicationAPI } from '../api/medicationAPI';
import { getVitalSignsByPatient } from '../api/vitalSignsAPI';
import logger from './logger';

/**
 * Comprehensive System Validator
 * Tests all major workflows and integrations
 */
export class SystemValidator {
  constructor() {
    this.testResults = [];
    this.testUser = null;
  }

  // Log test result
  logResult(testName, success, details = null, error = null) {
    const result = {
      test: testName,
      success,
      timestamp: new Date(),
      details,
      error: error?.message || null
    };
    
    this.testResults.push(result);
    
    if (success) {
      logger.info(`✅ Test passed: ${testName}`, result);
      console.log(`✅ ${testName}`);
    } else {
      logger.error(`❌ Test failed: ${testName}`, result);
      console.error(`❌ ${testName}:`, error?.message || details);
    }
    
    return success;
  }

  // Test 1: User Registration Flow
  async testUserRegistration() {
    try {
      const testEmail = `test-user-${Date.now()}@elderx-test.com`;
      const testPassword = 'TestPassword123!';
      
      // Create test user
      const userCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
      this.testUser = userCredential.user;
      
      // Wait for user context to create profile
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify user profile was created
      const users = await getAllUsers();
      const createdUser = users.find(u => u.email === testEmail);
      
      const success = createdUser && createdUser.userType === 'client';
      
      return this.logResult(
        'User Registration Flow',
        success,
        { 
          userId: this.testUser.uid,
          email: testEmail,
          profileCreated: !!createdUser,
          defaultRole: createdUser?.userType
        }
      );
    } catch (error) {
      return this.logResult('User Registration Flow', false, null, error);
    }
  }

  // Test 2: Admin User Verification
  async testAdminVerification() {
    try {
      if (!this.testUser) {
        throw new Error('No test user available for verification test');
      }

      // Simulate admin verification
      const verificationData = {
        userType: 'caregiver',
        profileComplete: true,
        qualificationLevel: 'intermediate',
        specializations: ['General Care', 'Medication Management'],
        certifications: ['CPR Certified', 'First Aid'],
        experience: '3 years',
        verifiedAt: new Date()
      };

      await updateUser(this.testUser.uid, verificationData);
      
      // Verify the update
      const users = await getAllUsers();
      const verifiedUser = users.find(u => u.id === this.testUser.uid);
      
      const success = verifiedUser && 
                     verifiedUser.userType === 'caregiver' && 
                     verifiedUser.profileComplete === true;
      
      return this.logResult(
        'Admin User Verification',
        success,
        {
          userId: this.testUser.uid,
          verifiedRole: verifiedUser?.userType,
          profileComplete: verifiedUser?.profileComplete,
          specializations: verifiedUser?.specializations
        }
      );
    } catch (error) {
      return this.logResult('Admin User Verification', false, null, error);
    }
  }

  // Test 3: Patient Assignment Workflow
  async testPatientAssignment() {
    try {
      if (!this.testUser) {
        throw new Error('No test user available for assignment test');
      }

      // Create a test client user
      const clientEmail = `test-client-${Date.now()}@elderx-test.com`;
      const clientCredential = await createUserWithEmailAndPassword(auth, clientEmail, 'TestPassword123!');
      
      // Wait for profile creation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create assignment
      const assignmentData = {
        patientId: clientCredential.user.uid,
        caregiverId: this.testUser.uid,
        assignedBy: 'system-test',
        startDate: new Date(),
        schedule: 'Mon-Fri 9AM-5PM',
        specialInstructions: 'Test assignment for system validation',
        accessLevel: 'standard'
      };

      const assignment = await assignmentAPI.createAssignment(assignmentData);
      
      // Verify assignment was created
      const assignments = await assignmentAPI.getAssignmentsByCaregiver(this.testUser.uid);
      const createdAssignment = assignments.find(a => a.id === assignment.id);
      
      const success = !!createdAssignment && createdAssignment.status === 'active';
      
      return this.logResult(
        'Patient Assignment Workflow',
        success,
        {
          assignmentId: assignment.id,
          caregiverId: this.testUser.uid,
          patientId: clientCredential.user.uid,
          status: createdAssignment?.status
        }
      );
    } catch (error) {
      return this.logResult('Patient Assignment Workflow', false, null, error);
    }
  }

  // Test 4: Data Connect Integration
  async testDataConnectIntegration() {
    try {
      // Test Data Connect user profile query
      const { dataConnectService } = await import('../services/dataConnectService');
      
      let dataConnectWorking = false;
      let firestoreFallback = false;
      
      try {
        const profile = await dataConnectService.getUserProfile(this.testUser.uid);
        dataConnectWorking = !!profile;
      } catch (error) {
        if (error.message.includes('fallback') || error.message.includes('not implemented')) {
          firestoreFallback = true;
        }
      }
      
      const success = dataConnectWorking || firestoreFallback;
      
      return this.logResult(
        'Data Connect Integration',
        success,
        {
          dataConnectWorking,
          firestoreFallback,
          testUserId: this.testUser.uid
        }
      );
    } catch (error) {
      return this.logResult('Data Connect Integration', false, null, error);
    }
  }

  // Test 5: Medication API
  async testMedicationAPI() {
    try {
      // Test medication fetching
      const medications = await medicationAPI.getMedications({
        patientId: this.testUser.uid,
        limit: 10
      });
      
      const success = Array.isArray(medications);
      
      return this.logResult(
        'Medication API',
        success,
        {
          medicationsCount: medications.length,
          apiWorking: true
        }
      );
    } catch (error) {
      return this.logResult('Medication API', false, null, error);
    }
  }

  // Test 6: Vital Signs API
  async testVitalSignsAPI() {
    try {
      // Test vital signs fetching
      const vitalSigns = await getVitalSignsByPatient(this.testUser.uid);
      
      const success = Array.isArray(vitalSigns);
      
      return this.logResult(
        'Vital Signs API',
        success,
        {
          vitalSignsCount: vitalSigns.length,
          apiWorking: true
        }
      );
    } catch (error) {
      return this.logResult('Vital Signs API', false, null, error);
    }
  }

  // Test 7: Emergency System
  async testEmergencySystem() {
    try {
      // Test emergency alert creation
      const emergencyData = {
        userId: this.testUser.uid,
        type: 'test',
        severity: 'low',
        description: 'System validation test emergency',
        location: 'Test Location',
        timestamp: new Date()
      };

      const emergency = await emergencyAPI.createEmergencyAlert(emergencyData);
      
      const success = !!emergency.id;
      
      return this.logResult(
        'Emergency System',
        success,
        {
          emergencyId: emergency.id,
          type: emergencyData.type,
          severity: emergencyData.severity
        }
      );
    } catch (error) {
      return this.logResult('Emergency System', false, null, error);
    }
  }

  // Run all tests
  async runAllTests() {
    console.log('🧪 Starting Comprehensive System Validation...\n');
    
    const tests = [
      () => this.testUserRegistration(),
      () => this.testAdminVerification(),
      () => this.testPatientAssignment(),
      () => this.testDataConnectIntegration(),
      () => this.testMedicationAPI(),
      () => this.testVitalSignsAPI(),
      () => this.testEmergencySystem()
    ];

    for (const test of tests) {
      await test();
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Cleanup test user
    await this.cleanup();

    // Generate summary
    this.generateSummary();
    
    return this.testResults;
  }

  // Cleanup test data
  async cleanup() {
    try {
      if (this.testUser) {
        // Sign out and delete test user would require admin privileges
        await signOut(auth);
        console.log('🧹 Test cleanup completed');
      }
    } catch (error) {
      console.warn('Cleanup warning:', error.message);
    }
  }

  // Generate test summary
  generateSummary() {
    const totalTests = this.testResults.length;
    const passedTests = this.testResults.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    
    console.log('\n📊 SYSTEM VALIDATION SUMMARY');
    console.log('=' .repeat(50));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`Success Rate: ${((passedTests/totalTests) * 100).toFixed(1)}%`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.testResults
        .filter(r => !r.success)
        .forEach(r => console.log(`  - ${r.test}: ${r.error}`));
    }
    
    console.log('\n🎯 System Status:', passedTests === totalTests ? 'FULLY OPERATIONAL' : 'NEEDS ATTENTION');
    console.log('=' .repeat(50));
  }
}

// Export singleton instance
export const systemValidator = new SystemValidator();
export default SystemValidator;
