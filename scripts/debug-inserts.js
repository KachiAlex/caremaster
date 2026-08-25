const knex = require('knex')(require('./knexfile').development);

(async () => {
  // Test conversation insert
  console.log('=== Test conversation insert ===');
  try {
    const [r] = await knex('conversations').insert({
      participants: JSON.stringify(['user1', 'user2']),
      conversation_type: 'general',
      type: 'general',
      last_message_at: new Date(),
      last_message_preview: null,
    }).returning('*');
    console.log('OK:', r.id);
    await knex('conversations').where({ id: r.id }).del();
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log('Detail:', e.detail);
  }

  // Test call insert
  console.log('\n=== Test call insert ===');
  try {
    const [r] = await knex('calls').insert({
      call_id: 'test_call_123',
      caller_id: 'user1',
      recipient_id: 'user2',
      receiver_id: 'user2',
      call_type: 'video',
      type: 'video',
      caller_name: 'Test',
      recipient_name: 'Test2',
      status: 'initiating',
      duration: 0,
      duration_seconds: 0,
    }).returning('*');
    console.log('OK:', r.id);
    await knex('calls').where({ id: r.id }).del();
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log('Detail:', e.detail);
  }

  // Test signaling insert
  console.log('\n=== Test signaling insert ===');
  try {
    const [r] = await knex('signaling').insert({
      call_id: 'test_call_123',
      type: 'offer',
      sdp: 'v=0',
      from_user_id: 'user1',
      timestamp: new Date(),
    }).returning('*');
    console.log('OK:', r.id);
    await knex('signaling').where({ id: r.id }).del();
  } catch (e) {
    console.log('ERROR:', e.message);
    console.log('Detail:', e.detail);
  }

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
