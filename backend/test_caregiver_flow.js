// Test the caregiver onboarding flow against the production API
const API_BASE = 'https://getcaremaster.com/api';

async function apiCall(path, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

async function main() {
  // 1. Login as admin to create a test caregiver
  console.log('=== Step 1: Login as admin ===');
  const loginRes = await apiCall('/auth/email-login', 'POST', {
    email: 'admin@getcaremaster.com',
    password: '***REMOVED***',
  });
  if (loginRes.status !== 200) {
    console.log('Admin login failed:', JSON.stringify(loginRes.data, null, 2));
    return;
  }
  const adminToken = loginRes.data?.data?.token;
  const adminUser = loginRes.data?.data?.user;
  console.log('Admin logged in:', adminUser?.email, adminUser?.userType);

  // 2. Create a test caregiver with a valid email
  console.log('\n=== Step 2: Create test caregiver ===');
  const testEmail = `testcaregiver${Date.now()}@gmail.com`;
  const createRes = await apiCall('/auth/create-staff', 'POST', {
    email: testEmail,
    password: 'test123456',
    first_name: 'Test',
    last_name: 'Caregiver',
    phone: '+2347039612000',
    user_type: 'caregiver',
    institution_id: '559fdd3b-f98e-46f8-b295-4cdaf20127d5',
    department: 'Healthcare',
  }, adminToken);
  console.log('Create status:', createRes.status);
  if (createRes.status !== 201) {
    console.log('Create failed:', JSON.stringify(createRes.data, null, 2));
    return;
  }
  const caregiverUser = createRes.data?.data?.user;
  console.log('Created caregiver:', caregiverUser?.email, 'ID:', caregiverUser?.id);

  // 3. Login as the test caregiver
  console.log('\n=== Step 3: Login as test caregiver ===');
  const cgLoginRes = await apiCall('/auth/email-login', 'POST', {
    email: testEmail,
    password: 'test123456',
  });
  console.log('Caregiver login status:', cgLoginRes.status);
  if (cgLoginRes.status !== 200) {
    console.log('Login failed:', JSON.stringify(cgLoginRes.data, null, 2));
    return;
  }
  const cgToken = cgLoginRes.data?.data?.token;
  const cgUserData = cgLoginRes.data?.data?.user;
  console.log('Caregiver user:', JSON.stringify({
    id: cgUserData?.id,
    email: cgUserData?.email,
    userType: cgUserData?.userType,
    onboardingComplete: cgUserData?.onboardingComplete,
    institutionId: cgUserData?.institutionId,
    status: cgUserData?.status,
  }, null, 2));

  // 4. Simulate onboarding step 1: save caregiver profile
  console.log('\n=== Step 4: Save caregiver profile (onboarding step 1) ===');
  // Try saving to caregivers table (may fail with 404 - that's OK)
  const caregiverSaveRes = await apiCall(`/data/caregivers/${cgUserData.id}`, 'PUT', {
    userId: cgUserData.id,
    first_name: 'Test',
    last_name: 'Caregiver',
    phone: '+2347039612000',
    email: testEmail,
    specialization: 'Geriatric Care',
    status: 'active',
    institution_id: cgUserData?.institutionId,
  }, cgToken);
  console.log('Save to caregivers table:', caregiverSaveRes.status, caregiverSaveRes.data?.success ? 'OK' : caregiverSaveRes.data?.message);

  // Save onboarding data to users table
  const userSaveRes = await apiCall(`/data/users/${cgUserData.id}`, 'PUT', {
    onboardingComplete: false,
    onboarding_data: {
      name: 'Test Caregiver',
      email: testEmail,
      phone: '+2347039612000',
      medicalQualification: 'Nurse (RN)',
      yearsOfExperience: '5',
      specializations: ['Geriatric Care', 'Palliative Care'],
      licenseNumber: 'RN12345',
      bio: 'Experienced nurse',
      onboardingStep: 1,
      onboardingComplete: false,
    },
  }, cgToken);
  console.log('Save onboarding data to users:', userSaveRes.status, userSaveRes.data?.success ? 'OK' : userSaveRes.data?.message);

  // 5. Simulate onboarding completion
  console.log('\n=== Step 5: Complete onboarding ===');
  const completeRes = await apiCall(`/data/users/${cgUserData.id}`, 'PUT', {
    onboardingComplete: true,
    userType: 'caregiver',
    status: 'active',
    is_active: true,
    institutionId: cgUserData?.institutionId,
  }, cgToken);
  console.log('Complete onboarding:', completeRes.status, completeRes.data?.success ? 'OK' : completeRes.data?.message);
  if (completeRes.data?.data) {
    console.log('Updated user:', JSON.stringify({
      onboardingComplete: completeRes.data.data.onboardingComplete,
      userType: completeRes.data.data.userType,
      status: completeRes.data.data.status,
    }, null, 2));
  }

  // 6. Verify by re-logging in
  console.log('\n=== Step 6: Verify by re-login ===');
  const verifyLoginRes = await apiCall('/auth/email-login', 'POST', {
    email: testEmail,
    password: 'test123456',
  });
  if (verifyLoginRes.status === 200) {
    const verifyUser = verifyLoginRes.data?.data?.user;
    console.log('After onboarding:', JSON.stringify({
      id: verifyUser?.id,
      userType: verifyUser?.userType,
      onboardingComplete: verifyUser?.onboardingComplete,
      status: verifyUser?.status,
      institutionId: verifyUser?.institutionId,
    }, null, 2));

    if (verifyUser?.onboardingComplete === true) {
      console.log('\n✅ SUCCESS: Onboarding is marked as complete!');
      console.log('✅ The caregiver would be routed to the dashboard (not onboarding)');
    } else {
      console.log('\n❌ FAIL: Onboarding is NOT marked as complete');
      console.log('   The caregiver would be redirected back to onboarding');
    }
  }

  // 7. Test caregiver dashboard access with fresh token
  console.log('\n=== Step 7: Test caregiver dashboard data access ===');
  const freshToken = verifyLoginRes.data?.data?.token;
  const dashboardRes = await apiCall('/data/clients?limit=5', 'GET', null, freshToken);
  console.log('Dashboard clients access:', dashboardRes.status, dashboardRes.data?.success ? 'OK' : dashboardRes.data?.message);
  if (dashboardRes.data?.data) {
    console.log('  Clients returned:', dashboardRes.data.data.length);
  }

  const assignmentsRes = await apiCall('/data/assignments?limit=5', 'GET', null, freshToken);
  console.log('Dashboard assignments access:', assignmentsRes.status, assignmentsRes.data?.success ? 'OK' : assignmentsRes.data?.message);
  if (assignmentsRes.data?.data) {
    console.log('  Assignments returned:', assignmentsRes.data.data.length);
  }

  const schedulesRes = await apiCall('/data/schedules?limit=5', 'GET', null, freshToken);
  console.log('Dashboard schedules access:', schedulesRes.status, schedulesRes.data?.success ? 'OK' : schedulesRes.data?.message);

  console.log('\n=== Test complete ===');
}

main().catch(err => console.error('Fatal error:', err));
