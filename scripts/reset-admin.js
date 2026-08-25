const bcrypt = require('bcryptjs');
const knex = require('knex')(require('./knexfile').development);

(async () => {
  const hash = await bcrypt.hash('Test@1234', 12);
  await knex('users')
    .where({ email: 'testadmin@getcaremaster.com' })
    .update({ password_hash: hash, is_active: true, status: 'active' });
  console.log('Password reset to Test@1234 for testadmin@getcaremaster.com');
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
