// Telemedicine Service Test Utility
import telemedicineService from '../services/telemedicineService';

export const testTelemedicineService = async () => {
  const results = {
    initialization: false,
    deviceDetection: false,
    permissions: false,
    errors: []
  };

  try {
    console.log('🧪 Testing Telemedicine Service...');

    // Test 1: Service Initialization
    try {
      await telemedicineService.initialize();
      results.initialization = true;
      console.log('✅ Service initialization: PASSED');
    } catch (error) {
      results.errors.push(`Initialization failed: ${error.message}`);
      console.error('❌ Service initialization: FAILED', error);
    }

    // Test 2: Device Detection
    try {
      const devices = await telemedicineService.getAvailableDevices();
      results.deviceDetection = devices.cameras.length > 0 || devices.microphones.length > 0;
      console.log('✅ Device detection: PASSED', devices);
    } catch (error) {
      results.errors.push(`Device detection failed: ${error.message}`);
      console.error('❌ Device detection: FAILED', error);
    }

    // Test 3: Permission Checks
    try {
      const hasCamera = await telemedicineService.checkCameraPermission();
      const hasMicrophone = await telemedicineService.checkMicrophonePermission();
      results.permissions = hasCamera || hasMicrophone;
      console.log('✅ Permission checks: PASSED', { hasCamera, hasMicrophone });
    } catch (error) {
      results.errors.push(`Permission checks failed: ${error.message}`);
      console.error('❌ Permission checks: FAILED', error);
    }

    // Overall Results
    const allTestsPassed = results.initialization && results.deviceDetection && results.permissions;
    
    if (allTestsPassed) {
      console.log('🎉 All telemedicine tests PASSED!');
    } else {
      console.log('⚠️ Some telemedicine tests FAILED:', results.errors);
    }

    return results;
  } catch (error) {
    console.error('💥 Telemedicine test suite failed:', error);
    results.errors.push(`Test suite failed: ${error.message}`);
    return results;
  }
};

// Quick test function for development
export const quickTest = async () => {
  console.log('🚀 Running quick telemedicine test...');
  
  try {
    // Test basic initialization
    await telemedicineService.initialize();
    console.log('✅ Basic initialization works');
    
    // Test device detection
    const devices = await telemedicineService.getAvailableDevices();
    console.log('✅ Device detection works:', devices);
    
    return true;
  } catch (error) {
    console.error('❌ Quick test failed:', error);
    return false;
  }
};
