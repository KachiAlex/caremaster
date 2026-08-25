/**
 * Test Add Client, Add Caregiver, Add Admin flows
 * against the production API at https://getcaremaster.com/api
 */
const API_BASE = 'https://getcaremaster.com/api';
const https = require('https');

// Small fetch polyfill for Node 18+
const fetch = globalThis.fetch || require('node-fetch');

const TEST = {
  admin: {
    email: 'admin@bulah.com',
    password: 'admin1234',
  },
  timestamp: Date.now(),
};

// Unique test data
const suffix = `test_${TEST.timestamp}`;
const testClient = {
  name: `Test Client ${suffix}`,
  email: `client_${suffix}@test.com`,
  phone: '+2348012345678',
  date_of_birth: '1990-01-15',
  gender: 'male',
  address: '123 Test Street',
  city: 'Lagos',
  state: 'Lagos',
  country: 'Nigeria',
  blood_type: 'O+',
  status: 'active',
};

const testCaregiver = {
  email: `caregiver_${suffix}@test.com`,
  password: 'Caregiver123!',
  first_name: 'Test',
  last_name: 'Caregiver',
  phone: '+2348098765432',
  user_type: 'caregiver',
  institution_id: null, // will be set after admin login
};

const testAdmin = {
  email: `admin_${suffix}@test.com`,
  password: 'Admin123!',
  first_name: 'Test',
  last_name: 'Admin',
  phone: '+2348055566677',
  user_type: 'admin',
  institution_id: null,
};

let adminToken = null;
let adminInstitutionId = null;
let createdClient = null;
let createdCaregiver = null;
let createdAdmin = null;

async function apiCall(method, path, body = null, token = null) {
  const url = `${API_BASE}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  try {
    const res = await fetch(url, options);
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, ok: res.ok };
  } catch (err) {
    return { status: 0, data: { error: err.message }, ok: false };
  }
}

function log(test, result, expected = 200) {
  const pass = result.status === expected || (expected === 'any' && result.ok);
  const icon = pass ? 'PASS' : 'FAIL';
  console.log(`  [${icon}] ${test}: status=${result.status}${result.data?.message ? ' msg=' + result.data.message : ''}${result.data?.error ? ' err=' + result.data.error : ''}`);
  return pass;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function runTests() {
  console.log('\n========================================');
  console.log('  CareMaster Flow Tests');
  console.log('  API: ' + API_BASE);
  console.log('  Time: ' + new Date().toISOString());
  console.log('========================================\n');

  // ─── 1. ADMIN LOGIN ───
  console.log('--- 1. Admin Login ---');
  const loginRes = await apiCall('POST', '/auth/email-login', {
    email: TEST.admin.email,
    password: TEST.admin.password,
  });

  if (!log('Admin login', loginRes, 200)) {
    console.log('\n  Cannot proceed without admin login. Aborting.\n');
    return;
  }

  adminToken = loginRes.data.data?.token || loginRes.data.token || loginRes.data.accessToken;
  const adminUser = loginRes.data.data?.user || loginRes.data.user;
  adminInstitutionId = adminUser?.institution_id || adminUser?.institutionId;
  console.log(`  Admin token: ${adminToken ? 'OK' : 'MISSING'}`);
  console.log(`  Institution ID: ${adminInstitutionId || 'MISSING'}`);
  console.log(`  User type: ${adminUser?.user_type || adminUser?.userType}`);

  if (!adminToken) {
    console.log('\n  No token received. Aborting.\n');
    return;
  }

  // Set institution_id for test data
  testCaregiver.institution_id = adminInstitutionId;
  testAdmin.institution_id = adminInstitutionId;
  testClient.institutionId = adminInstitutionId;
  testClient.institution_id = adminInstitutionId;

  // ─── 2. ADD CLIENT ───
  console.log('\n--- 2. Add Client ---');
  const clientRes = await apiCall('POST', '/data/clients', testClient, adminToken);
  log('Create client via /data/clients', clientRes, 'any');

  if (clientRes.ok) {
    createdClient = clientRes.data;
    console.log(`  Client ID: ${createdClient.id || createdClient._id || 'N/A'}`);
  }

  // Also try patients table
  const patientRes = await apiCall('POST', '/data/patients', testClient, adminToken);
  log('Create client via /data/patients', patientRes, 'any');

  // ─── 3. ADD CAREGIVER (via /auth/create-staff) ───
  console.log('\n--- 3. Add Caregiver ---');
  await sleep(2000);
  const caregiverRes = await apiCall('POST', '/auth/create-staff', testCaregiver, adminToken);
  log('Create caregiver via /auth/create-staff', caregiverRes, 'any');

  if (caregiverRes.ok) {
    createdCaregiver = caregiverRes.data.data || caregiverRes.data;
    console.log(`  Caregiver ID: ${createdCaregiver.user?.id || createdCaregiver.id || createdCaregiver.userId || 'N/A'}`);
  }

  // ─── 4. ADD ADMIN (via /auth/create-staff) ───
  console.log('\n--- 4. Add Admin ---');
  await sleep(2000);
  const adminRes = await apiCall('POST', '/auth/create-staff', testAdmin, adminToken);
  log('Create admin via /auth/create-staff', adminRes, 'any');

  if (adminRes.ok) {
    createdAdmin = adminRes.data.data || adminRes.data;
    console.log(`  Admin ID: ${createdAdmin.user?.id || createdAdmin.id || createdAdmin.userId || 'N/A'}`);
  }

  // ─── 5. VERIFY CAREGIVER CAN LOGIN ───
  console.log('\n--- 5. Verify Caregiver Login ---');
  await sleep(2000);
  if (createdCaregiver) {
    const cgLoginRes = await apiCall('POST', '/auth/email-login', {
      email: testCaregiver.email,
      password: testCaregiver.password,
    });
    log('Caregiver login', cgLoginRes, 200);
    if (cgLoginRes.ok) {
      const cgUser = cgLoginRes.data.data?.user || cgLoginRes.data.user;
      console.log(`  Caregiver type: ${cgUser?.user_type || cgUser?.userType}`);
    }
  }

  // ─── 6. VERIFY ADMIN CAN LOGIN ───
  console.log('\n--- 6. Verify New Admin Login ---');
  await sleep(2000);
  if (createdAdmin) {
    const admLoginRes = await apiCall('POST', '/auth/email-login', {
      email: testAdmin.email,
      password: testAdmin.password,
    });
    log('New admin login', admLoginRes, 200);
    if (admLoginRes.ok) {
      const admUser = admLoginRes.data.data?.user || admLoginRes.data.user;
      console.log(`  Admin type: ${admUser?.user_type || admUser?.userType}`);
    }
  }

  // ─── 7. CLEANUP - Delete test users ───
  console.log('\n--- 7. Cleanup ---');
  await sleep(2000);
  if (createdCaregiver) {
    const cgId = createdCaregiver.user?.id || createdCaregiver.id;
    if (cgId) {
      const delRes = await apiCall('DELETE', `/data/users/${cgId}`, null, adminToken);
      log('Delete test caregiver', delRes, 'any');
    }
  }
  if (createdAdmin) {
    const admId = createdAdmin.user?.id || createdAdmin.id;
    if (admId) {
      const delRes = await apiCall('DELETE', `/data/users/${admId}`, null, adminToken);
      log('Delete test admin', delRes, 'any');
    }
  }
  if (createdClient) {
    const clientId = createdClient.id || createdClient._id;
    if (clientId) {
      const delRes = await apiCall('DELETE', `/data/clients/${clientId}`, null, adminToken);
      log('Delete test client', delRes, 'any');
    }
  }

  console.log('\n========================================');
  console.log('  Tests Complete');
  console.log('========================================\n');
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
