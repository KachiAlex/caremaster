const knex = require('knex')({
  client: 'pg',
  connection: {
    host: '127.0.0.1',
    port: 5432,
    user: 'postgres',
    password: '***REMOVED***',
    database: 'caremaster'
  }
});
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const user = await knex('users')
      .whereRaw('LOWER(email) = LOWER(?)', ['admin@getcaremaster.com'.trim().toLowerCase()])
      .first();

    console.log('User found:', !!user);
    console.log('User ID:', user?.id);
    console.log('Email:', user?.email);
    console.log('User type:', user?.user_type);
    console.log('Is active:', user?.is_active);
    console.log('Status:', user?.status);
    console.log('Has password_hash:', !!user?.password_hash);
    console.log('Password hash prefix:', user?.password_hash?.substring(0, 10));

    if (user?.password_hash) {
      const valid = await bcrypt.compare('***REMOVED***', user.password_hash);
      console.log('Password valid:', valid);
    }

    // Also check the 'password' column
    console.log('Has password field:', !!user?.password);
    if (user?.password) {
      console.log('Password field value (first 20 chars):', user.password.substring(0, 20));
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
