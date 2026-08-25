const knex = require('knex')(require('./knexfile').development);

(async () => {
  // Test signaling with 'from' field (reserved word)
  console.log('=== Test signaling with from field ===');
  try {
    const [r] = await knex('signaling').insert({
      call_id: 'test_call_from',
      type: 'offer',
      sdp: 'v=0',
      from: 'user1',
      timestamp: new Date()
    }).returning('*');
    console.log('OK:', r.id);
    await knex('signaling').where({ id: r.id }).del();
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  // Test signaling with candidate as JSONB
  console.log('\n=== Test signaling with candidate JSONB ===');
  try {
    const [r] = await knex('signaling').insert({
      call_id: 'test_call_ice',
      type: 'ice-candidate',
      candidate: JSON.stringify({ candidate: 'test-candidate', sdpMLineIndex: 0 }),
      from: 'user1',
      timestamp: new Date()
    }).returning('*');
    console.log('OK:', r.id);
    await knex('signaling').where({ id: r.id }).del();
  } catch (e) {
    console.log('ERROR:', e.message);
  }

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
