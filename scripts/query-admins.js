const knex = require('knex')(require('./knexfile').development);
knex('users')
  .whereIn('user_type', ['admin', 'super_admin', 'institutionAdmin'])
  .select('id', 'email', 'user_type', 'is_active', 'status')
  .then(r => { console.log(JSON.stringify(r, null, 2)); process.exit(0); })
  .catch(e => { console.error(e); process.exit(1); });
