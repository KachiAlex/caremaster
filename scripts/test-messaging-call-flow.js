/**
 * Test messaging, call, and video call flows through the VPS backend.
 * Tests: conversation creation, message send/receive, call initiation,
 * call notification, call answer/reject/end, and signaling.
 */
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

  // === Step 1: Login as admin to get token ===
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
  console.log('Admin login OK. User ID:', adminUser.id);

  // We need two users for messaging/call testing. Create a second test user.
  console.log('\n=== Creating second test user (caregiver) ===');
  const caregiverEmail = `msgtest_${Date.now()}@getcaremaster.com`;
  const createRes = await httpRequest('POST', '/auth/create-staff', {
    email: caregiverEmail,
    password: 'Test@1234',
    first_name: 'Message',
    last_name: 'TestUser',
    phone: '+2348012345678',
    user_type: 'caregiver',
    institution_id: null,
    department: 'Healthcare'
  }, token);
  log('Second test user created', createRes.status === 201 && createRes.body.success,
    `status=${createRes.status}, ${JSON.stringify(createRes.body).slice(0, 150)}`);
  const caregiverId = createRes.body.success ? createRes.body.data.user.id : null;
  const adminId = adminUser.id;

  // ============================================================
  // MESSAGING FLOW TESTS
  // ============================================================
  console.log('\n=== MESSAGING FLOW TESTS ===');

  // Test 1: Create a conversation
  console.log('\n--- Test 1: Create conversation ---');
  const convRes = await httpRequest('POST', '/data/conversations', {
    participants: [adminId, caregiverId],
    conversationType: 'general',
    lastMessage: null,
    lastMessageTime: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }, token);
  log('Conversation created via /data/conversations',
    convRes.status === 201 && convRes.body.success,
    `status=${convRes.status}, ${JSON.stringify(convRes.body).slice(0, 200)}`);
  const conversationId = convRes.body.success ? (convRes.body.data.id || convRes.body.data.Id) : null;
  console.log('Conversation ID:', conversationId);

  // Test 2: Send a message
  console.log('\n--- Test 2: Send message ---');
  const msgRes = await httpRequest('POST', '/data/messages', {
    conversationId: conversationId || 'test-conv',
    senderId: adminId,
    text: 'Hello, this is a test message',
    content: 'Hello, this is a test message',
    read: false,
    createdAt: new Date().toISOString()
  }, token);
  log('Message sent via /data/messages',
    msgRes.status === 201 && msgRes.body.success,
    `status=${msgRes.status}, ${JSON.stringify(msgRes.body).slice(0, 200)}`);
  const messageId = msgRes.body.success ? (msgRes.body.data.id || msgRes.body.data.Id) : null;

  // Test 3: Send a second message from caregiver
  console.log('\n--- Test 3: Send reply message ---');
  const msg2Res = await httpRequest('POST', '/data/messages', {
    conversationId: conversationId || 'test-conv',
    senderId: caregiverId,
    text: 'Hi, received your message',
    content: 'Hi, received your message',
    read: false,
    createdAt: new Date().toISOString()
  }, token);
  log('Reply message sent',
    msg2Res.status === 201 && msg2Res.body.success,
    `status=${msg2Res.status}, ${JSON.stringify(msg2Res.body).slice(0, 200)}`);

  // Test 4: Fetch messages for conversation
  console.log('\n--- Test 4: Fetch messages ---');
  const fetchMsgRes = await httpRequest('GET', '/data/messages', null, token);
  log('Messages fetched via /data/messages',
    fetchMsgRes.status === 200 && fetchMsgRes.body.success,
    `status=${fetchMsgRes.status}, count=${fetchMsgRes.body.data ? (Array.isArray(fetchMsgRes.body.data) ? fetchMsgRes.body.data.length : 1) : 0}`);

  // Test 5: Fetch conversations
  console.log('\n--- Test 5: Fetch conversations ---');
  const fetchConvRes = await httpRequest('GET', '/data/conversations', null, token);
  log('Conversations fetched via /data/conversations',
    fetchConvRes.status === 200 && fetchConvRes.body.success,
    `status=${fetchConvRes.status}, count=${fetchConvRes.body.data ? (Array.isArray(fetchConvRes.body.data) ? fetchConvRes.body.data.length : 1) : 0}`);

  // Test 6: Update message as read
  if (messageId && messageId !== 'no-table') {
    console.log('\n--- Test 6: Mark message as read ---');
    const readRes = await httpRequest('PUT', `/data/messages/${messageId}`, {
      read: true,
      readAt: new Date().toISOString()
    }, token);
    log('Message marked as read',
      readRes.status === 200 && readRes.body.success,
      `status=${readRes.status}, ${JSON.stringify(readRes.body).slice(0, 150)}`);
  } else {
    log('Message marked as read', false, 'No valid message ID to update');
  }

  // ============================================================
  // CALL FLOW TESTS
  // ============================================================
  console.log('\n=== CALL FLOW TESTS ===');

  // Test 7: Initiate a call (voice)
  console.log('\n--- Test 7: Initiate voice call ---');
  const callRes = await httpRequest('POST', '/data/calls', {
    callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    callerId: adminId,
    recipientId: caregiverId,
    callType: 'audio',
    callerName: 'Test Admin',
    recipientName: 'Message TestUser',
    status: 'initiating',
    createdAt: new Date().toISOString(),
    answeredAt: null,
    endedAt: null,
    duration: 0
  }, token);
  log('Voice call initiated via /data/calls',
    callRes.status === 201 && callRes.body.success,
    `status=${callRes.status}, ${JSON.stringify(callRes.body).slice(0, 200)}`);
  const callRecordId = callRes.body.success ? (callRes.body.data.id || callRes.body.data.Id) : null;
  const callId = callRes.body.success ? callRes.body.data.callId : null;

  // Test 8: Send call notification
  console.log('\n--- Test 8: Send call notification ---');
  const notifRes = await httpRequest('POST', '/data/callNotifications', {
    userId: caregiverId,
    callId: callId || 'test-call-id',
    callerId: adminId,
    callType: 'audio',
    status: 'incoming',
    callerName: 'Test Admin',
    timestamp: new Date().toISOString()
  }, token);
  log('Call notification sent via /data/callNotifications',
    notifRes.status === 201 && notifRes.body.success,
    `status=${notifRes.status}, ${JSON.stringify(notifRes.body).slice(0, 200)}`);

  // Test 9: Answer the call
  if (callRecordId && callRecordId !== 'no-table') {
    console.log('\n--- Test 9: Answer call ---');
    const answerRes = await httpRequest('PUT', `/data/calls/${callRecordId}`, {
      status: 'answered',
      answeredAt: new Date().toISOString()
    }, token);
    log('Call answered (status updated)',
      answerRes.status === 200 && answerRes.body.success,
      `status=${answerRes.status}, ${JSON.stringify(answerRes.body).slice(0, 150)}`);
  } else {
    log('Call answered (status updated)', false, 'No valid call record ID');
  }

  // Test 10: End the call
  if (callRecordId && callRecordId !== 'no-table') {
    console.log('\n--- Test 10: End call ---');
    const endRes = await httpRequest('PUT', `/data/calls/${callRecordId}`, {
      status: 'ended',
      endedAt: new Date().toISOString(),
      duration: 45
    }, token);
    log('Call ended (status updated)',
      endRes.status === 200 && endRes.body.success,
      `status=${endRes.status}, ${JSON.stringify(endRes.body).slice(0, 150)}`);
  } else {
    log('Call ended (status updated)', false, 'No valid call record ID');
  }

  // ============================================================
  // VIDEO CALL FLOW TESTS
  // ============================================================
  console.log('\n=== VIDEO CALL FLOW TESTS ===');

  // Test 11: Initiate a video call
  console.log('\n--- Test 11: Initiate video call ---');
  const videoCallRes = await httpRequest('POST', '/data/calls', {
    callId: `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    callerId: adminId,
    recipientId: caregiverId,
    callType: 'video',
    callerName: 'Test Admin',
    recipientName: 'Message TestUser',
    status: 'initiating',
    createdAt: new Date().toISOString(),
    answeredAt: null,
    endedAt: null,
    duration: 0
  }, token);
  log('Video call initiated via /data/calls',
    videoCallRes.status === 201 && videoCallRes.body.success,
    `status=${videoCallRes.status}, ${JSON.stringify(videoCallRes.body).slice(0, 200)}`);
  const videoCallRecordId = videoCallRes.body.success ? (videoCallRes.body.data.id || videoCallRes.body.data.Id) : null;
  const videoCallId = videoCallRes.body.success ? videoCallRes.body.data.callId : null;

  // Test 12: Send video call notification
  console.log('\n--- Test 12: Send video call notification ---');
  const videoNotifRes = await httpRequest('POST', '/data/callNotifications', {
    userId: caregiverId,
    callId: videoCallId || 'test-video-call-id',
    callerId: adminId,
    callType: 'video',
    status: 'incoming',
    callerName: 'Test Admin',
    timestamp: new Date().toISOString()
  }, token);
  log('Video call notification sent',
    videoNotifRes.status === 201 && videoNotifRes.body.success,
    `status=${videoNotifRes.status}, ${JSON.stringify(videoNotifRes.body).slice(0, 200)}`);

  // Test 13: Send WebRTC signaling - SDP offer
  console.log('\n--- Test 13: Send SDP offer (signaling) ---');
  const sdpRes = await httpRequest('POST', '/data/signaling', {
    callId: videoCallId || 'test-video-call-id',
    type: 'offer',
    sdp: 'v=0\r\no=- 123456 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\n',
    from: adminId,
    timestamp: new Date().toISOString()
  }, token);
  log('SDP offer sent via /data/signaling',
    sdpRes.status === 201 && sdpRes.body.success,
    `status=${sdpRes.status}, ${JSON.stringify(sdpRes.body).slice(0, 200)}`);

  // Test 14: Send ICE candidate
  console.log('\n--- Test 14: Send ICE candidate (signaling) ---');
  const iceRes = await httpRequest('POST', '/data/signaling', {
    callId: videoCallId || 'test-video-call-id',
    type: 'ice-candidate',
    candidate: {
      candidate: 'candidate:842163049 1 udp 1677729535 192.0.2.3 64299 typ srflx',
      sdpMLineIndex: 0,
      sdpMid: '0'
    },
    from: adminId,
    timestamp: new Date().toISOString()
  }, token);
  log('ICE candidate sent via /data/signaling',
    iceRes.status === 201 && iceRes.body.success,
    `status=${iceRes.status}, ${JSON.stringify(iceRes.body).slice(0, 200)}`);

  // Test 15: Fetch call history
  console.log('\n--- Test 15: Fetch call history ---');
  const callHistoryRes = await httpRequest('GET', '/data/calls', null, token);
  log('Call history fetched',
    callHistoryRes.status === 200 && callHistoryRes.body.success,
    `status=${callHistoryRes.status}, count=${callHistoryRes.body.data ? (Array.isArray(callHistoryRes.body.data) ? callHistoryRes.body.data.length : 1) : 0}`);

  // Test 16: Fetch call notifications
  console.log('\n--- Test 16: Fetch call notifications ---');
  const notifHistoryRes = await httpRequest('GET', '/data/callNotifications', null, token);
  log('Call notifications fetched',
    notifHistoryRes.status === 200 && notifHistoryRes.body.success,
    `status=${notifHistoryRes.status}, count=${notifHistoryRes.body.data ? (Array.isArray(notifHistoryRes.body.data) ? notifHistoryRes.body.data.length : 1) : 0}`);

  // ============================================================
  // CLEANUP
  // ============================================================
  console.log('\n=== Cleanup ===');
  try {
    // Delete test messages, conversations, calls, notifications, and user
    if (messageId && messageId !== 'no-table') {
      await httpRequest('DELETE', `/data/messages/${messageId}`, null, token);
    }
    if (conversationId && conversationId !== 'no-table') {
      await httpRequest('DELETE', `/data/conversations/${conversationId}`, null, token);
    }
    if (callRecordId && callRecordId !== 'no-table') {
      await httpRequest('DELETE', `/data/calls/${callRecordId}`, null, token);
    }
    if (videoCallRecordId && videoCallRecordId !== 'no-table') {
      await httpRequest('DELETE', `/data/calls/${videoCallRecordId}`, null, token);
    }
    console.log('Test records cleaned up (frontend data).');
  } catch (e) {
    console.log('Cleanup partial:', e.message);
  }

  // Summary
  console.log(`\n=== RESULTS: ${results.pass} passed, ${results.fail} failed ===`);
  if (results.fail > 0) {
    console.log('\nFailed tests:');
    results.tests.filter(t => !t.pass).forEach(t => console.log(`  - ${t.name}: ${t.detail}`));
  }
  process.exit(results.fail > 0 ? 1 : 0);
})().catch(e => { console.error('Fatal:', e); process.exit(1); });
