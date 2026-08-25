const http = require('http');
const BASE = 'http://localhost:5002/api';

function req(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (data) headers['Content-Length'] = Buffer.byteLength(data);
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const r = http.request(`${BASE}${path}`, { method, headers }, (res) => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => { try { resolve(JSON.parse(buf)); } catch { resolve(buf); } });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

(async () => {
  // Login
  const login = await req('POST', '/auth/email-login', {
    email: 'testadmin@getcaremaster.com',
    password: 'Test@1234'
  });
  const token = login.data.token;

  // Try creating a call with minimal fields
  console.log('=== Test 1: Minimal call fields ===');
  const r1 = await req('POST', '/data/calls', {
    callerId: 'test-caller',
    recipientId: 'test-recipient',
    status: 'initiating'
  }, token);
  console.log(JSON.stringify(r1, null, 2));

  // Try with just the DB column names (snake_case)
  console.log('\n=== Test 2: Direct snake_case fields ===');
  const r2 = await req('POST', '/data/calls', {
    caller_id: 'test-caller',
    receiver_id: 'test-recipient',
    status: 'initiating'
  }, token);
  console.log(JSON.stringify(r2, null, 2));

  // Try with just the basic writable fields
  console.log('\n=== Test 3: Only writable fields ===');
  const r3 = await req('POST', '/data/calls', {
    caller_id: 'test-caller',
    recipient_id: 'test-recipient',
    status: 'initiating',
    duration: 0
  }, token);
  console.log(JSON.stringify(r3, null, 2));

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
