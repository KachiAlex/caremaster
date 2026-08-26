exports.up = async function(knex) {
  await knex.schema.table('login_attempts', (table) => {
    table.uuid('institution_id').nullable();
  });

  await knex.schema.table('user_sessions', (table) => {
    table.uuid('institution_id').nullable();
  });

  // Add indexes for the tenant-scoped queries the Security tab runs
  await knex.schema.table('login_attempts', (table) => {
    table.index(['institution_id', 'success', 'timestamp'], 'idx_login_attempts_institution_success_timestamp');
  });

  await knex.schema.table('user_sessions', (table) => {
    table.index(['institution_id', 'active', 'last_activity'], 'idx_user_sessions_institution_active_last_activity');
  });

  // Backfill existing rows with the user's institution_id where possible
  await knex.raw(`
    UPDATE login_attempts la
    SET institution_id = u.institution_id
    FROM users u
    WHERE la.user_id = u.id AND la.institution_id IS NULL
  `);

  await knex.raw(`
    UPDATE user_sessions us
    SET institution_id = u.institution_id
    FROM users u
    WHERE us.user_id = u.id AND us.institution_id IS NULL
  `);
};

exports.down = async function(knex) {
  await knex.schema.table('user_sessions', (table) => {
    table.dropColumn('institution_id');
    table.dropIndex(['institution_id', 'active', 'last_activity'], 'idx_user_sessions_institution_active_last_activity');
  });

  await knex.schema.table('login_attempts', (table) => {
    table.dropColumn('institution_id');
    table.dropIndex(['institution_id', 'success', 'timestamp'], 'idx_login_attempts_institution_success_timestamp');
  });
};
