// Test all three creation routes: client, caregiver, admin
const bcrypt = require('bcryptjs');
const knex = require('knex')(require('./knexfile').development);
const http = require('http');

const BASE = 'http://localhost:5002/api';

function httpRequest(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(`${BASE}${path}`, { method, headers }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  const results = { pass: 0, fail: 0, tests: [] };

  function log(name, pass, detail) {
    results.tests.push({ name, pass, detail });
    if (pass) { results.pass++; console.log(`PASS: ${name}`); }
    else { results.fail++; console.log(`FAIL: ${name} — ${detail}`); }
  }

  // Step 1: Login as admin
  console.log('\n=== Logging in as admin ===');
  const loginRes = await httpRequest('POST', '/auth/email-login', {
    email: 'testadmin@getcaremaster.com',
    password: 'Test@1234'
  });
  if (loginRes.status !== 200 || !loginRes.body.success) {
    console.log('Admin login failed:', JSON.stringify(loginRes.body));
    process.exit(1);
  }
  const token = loginRes.body.data.token;
  const adminUser = loginRes.body.data.user;
  console.log('Admin login OK. Token acquired.');

  // Step 2: Test CAREGIVER creation via /auth/create-staff
  console.log('\n=== Test 1: Caregiver creation (POST /auth/create-staff) ===');
  const caregiverEmail = `testcaregiver_${Date.now()}@getcaremaster.com`;
  const caregiverRes = await httpRequest('POST', '/auth/create-staff', {
    email: caregiverEmail,
    password: 'Caregiver@123',
    first_name: 'Test',
    last_name: 'Caregiver',
    phone: '+2348012345678',
    user_type: 'caregiver',
    institution_id: adminUser.institutionId || null,
    department: 'Healthcare'
  }, token);
  log('Caregiver created via /auth/create-staff',
    caregiverRes.status === 201 && caregiverRes.body.success,
    `status=${caregiverRes.status}, ${JSON.stringify(caregiverRes.body).slice(0, 200)}`);

  // Verify caregiver in DB
  if (caregiverRes.body.success) {
    const cg = await knex('users').where({ email: caregiverEmail }).first();
    log('Caregiver exists in DB', !!cg, cg ? `id=${cg.id}, type=${cg.user_type}` : 'not found');
  }

  // Step 3: Test ADMIN creation via /auth/create-staff
  console.log('\n=== Test 2: Admin creation (POST /auth/create-staff with user_type=admin) ===');
  const newAdminEmail = `testadmin_${Date.now()}@getcaremaster.com`;
  const adminRes = await httpRequest('POST', '/auth/create-staff', {
    email: newAdminEmail,
    password: 'Admin@1234',
    first_name: 'New',
    last_name: 'Admin',
    phone: '+2348098765432',
    user_type: 'admin',
    institution_id: adminUser.institutionId || null,
    department: 'Administration'
  }, token);
  log('Admin created via /auth/create-staff',
    adminRes.status === 201 && adminRes.body.success,
    `status=${adminRes.status}, ${JSON.stringify(adminRes.body).slice(0, 200)}`);

  // Verify admin in DB
  if (adminRes.body.success) {
    const ad = await knex('users').where({ email: newAdminEmail }).first();
    log('Admin exists in DB', !!ad, ad ? `id=${ad.id}, type=${ad.user_type}` : 'not found');
  }

  // Step 4: Test CLIENT creation via /data/clients (POST)
  console.log('\n=== Test 3: Client creation (POST /data/clients) ===');
  const clientData = {
    firstName: 'Test',
    lastName: 'Client',
    email: `testclient_${Date.now()}@getcaremaster.com`,
    phone: '+2348055544332',
    dateOfBirth: '1985-06-15',
    gender: 'male',
    address: '123 Test Street, Lagos',
    bloodGroup: 'O+',
    emergencyContactName: 'Emergency Contact',
    emergencyContactPhone: '+2348077788899',
    status: 'active',
    createdBy: adminUser.id
  };
  const clientRes = await httpRequest('POST', '/data/clients', clientData, token);
  log('Client created via /data/clients',
    clientRes.status === 201 && clientRes.body.success,
    `status=${clientRes.status}, ${JSON.stringify(clientRes.body).slice(0, 200)}`);

  // Verify client in DB
  if (clientRes.body.success) {
    const cl = await knex('clients').where({ email: clientData.email }).first();
    log('Client exists in DB', !!cl, cl ? `id=${cl.id}` : 'not found');
  }

  // Step 5: Test CLIENT creation via /data/users (POST) — alternative path
  console.log('\n=== Test 4: Client user creation (POST /data/users) ===');
  const clientUserData = {
    firstName: 'Client',
    lastName: 'User',
    email: `clientuser_${Date.now()}@getcaremaster.com`,
    phone: '+2348011122233',
    userType: 'client',
    status: 'active',
    joinDate: new Date().toISOString(),
    lastActive: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  const clientUserRes = await httpRequest('POST', '/data/users', clientUserData, token);
  log('Client user created via /data/users',
    clientUserRes.status === 201 && clientUserRes.body.success,
    `status=${clientUserRes.status}, ${JSON.stringify(clientUserRes.body).slice(0, 200)}`);

  // Cleanup: delete test records
  console.log('\n=== Cleanup ===');
  try {
    await knex('users').where({ email: caregiverEmail }).del();
    await knex('users').where({ email: newAdminEmail }).del();
    if (clientData.email) await knex('clients').where({ email: clientData.email }).del();
    if (clientUserData.email) await knex('users').where({ email: clientUserData.email }).del();
    console.log('Test records cleaned up.');
  } catch (e) {
    console.log('Cleanup skipped:', e.message);
  }

  // Summary
  console.log(`\n=== RESULTS: ${results.pass} passed, ${results.fail} failed ===`);
  process.exit(results.fail > 0 ? 1 : 0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
