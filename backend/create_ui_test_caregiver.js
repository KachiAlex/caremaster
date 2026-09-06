// Create a fresh test caregiver for UI testing
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
  // Login as admin
  const loginRes = await apiCall('/auth/email-login', 'POST', {
    email: 'admin@getcaremaster.com',
    password: '***REMOVED***',
  });
  const adminToken = loginRes.data?.data?.token;

  // Create a fresh test caregiver
  const testEmail = `uitestcaregiver${Date.now()}@gmail.com`;
  const createRes = await apiCall('/auth/create-staff', 'POST', {
    email: testEmail,
    password: 'test123456',
    first_name: 'UI',
    last_name: 'Tester',
    phone: '+2347039612999',
    user_type: 'caregiver',
    institution_id: '559fdd3b-f98e-46f8-b295-4cdaf20127d5',
    department: 'Healthcare',
  }, adminToken);

  if (createRes.status === 201) {
    console.log('Test caregiver created:');
    console.log('  Email:', testEmail);
    console.log('  Password: test123456');
    console.log('  ID:', createRes.data?.data?.user?.id);
    console.log('  Institution:', '559fdd3b-f98e-46f8-b295-4cdaf20127d5');
  } else {
    console.log('Failed to create:', JSON.stringify(createRes.data, null, 2));
  }
}

main().catch(err => console.error('Error:', err));
