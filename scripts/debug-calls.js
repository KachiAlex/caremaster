const knex = require('knex')(require('./knexfile').development);

(async () => {
  console.log('=== Test call insert with all fields ===');
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
    if (e.detail) console.log('Detail:', e.detail);
  }

  // Check calls columns
  const cols = await knex('information_schema.columns')
    .where({ table_name: 'calls' })
    .select('column_name', 'data_type')
    .orderBy('ordinal_position');
  console.log('\n=== calls columns ===');
  cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type})`));

  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
