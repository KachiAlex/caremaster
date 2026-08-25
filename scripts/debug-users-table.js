const knex = require('knex')(require('./knexfile').development);

(async () => {
  // Check users table columns
  const cols = await knex('information_schema.columns')
    .where({ table_name: 'users' })
    .select('column_name', 'is_nullable', 'column_default')
    .orderBy('ordinal_position');
  console.log('=== users table columns ===');
  cols.forEach(c => console.log(`  ${c.column_name} (nullable=${c.is_nullable}, default=${c.column_default})`));

  // Try inserting a minimal user to see the actual error
  console.log('\n=== Attempting direct insert ===');
  try {
    const [r] = await knex('users').insert({
      matric_number: 'TEST/' + Date.now(),
      email: 'dbtest_' + Date.now() + '@getcaremaster.com',
      password_hash: 'dummy',
      first_name: 'DB',
      last_name: 'Test',
      user_type: 'client',
      is_active: true,
      is_verified: true,
      status: 'active'
    }).returning('*');
    console.log('Insert OK:', r.id);
    await knex('users').where({ id: r.id }).del();
    console.log('Cleaned up.');
  } catch (e) {
    console.log('Insert error:', e.message);
    console.log('Detail:', e.detail);
    console.log('Constraint:', e.constraint);
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
