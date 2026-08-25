// Test client creation via /auth/create-staff with user_type=client
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
  // Login as admin
  const loginRes = await httpRequest('POST', '/auth/email-login', {
    email: 'testadmin@getcaremaster.com',
    password: 'Test@1234'
  });
  const token = loginRes.body.data.token;
  const adminUser = loginRes.body.data.user;
  console.log('Admin login OK.');

  // Test: Create CLIENT via /auth/create-staff
  console.log('\n=== Test: Client creation via /auth/create-staff (user_type=client) ===');
  const clientEmail = `clientauth_${Date.now()}@getcaremaster.com`;
  const res = await httpRequest('POST', '/auth/create-staff', {
    email: clientEmail,
    password: 'Client@123',
    first_name: 'Test',
    last_name: 'Client',
    phone: '+2348012345678',
    user_type: 'client',
    institution_id: adminUser.institutionId || null,
    department: 'Healthcare'
  }, token);
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${JSON.stringify(res.body, null, 2)}`);

  if (res.body.success) {
    const u = await knex('users').where({ email: clientEmail }).first();
    console.log(`\nDB verification: ${u ? `id=${u.id}, type=${u.user_type}` : 'NOT FOUND'}`);
    await knex('users').where({ email: clientEmail }).del();
    console.log('Cleaned up.');
  }

  process.exit(res.body.success ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
