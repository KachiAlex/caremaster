exports.up = async function(knex) {
  // Audit logs for the security tab (distinct from the generic audit_logs table)
  await knex.schema.createTableIfNotExists('security_audit_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable();
    table.string('user_role').nullable();
    table.string('action').nullable();
    table.string('resource_type').nullable();
    table.string('resource_id').nullable();
    table.jsonb('details').nullable();
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    table.uuid('institution_id').nullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // Active user sessions
  await knex.schema.createTableIfNotExists('user_sessions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable();
    table.text('user_agent').nullable();
    table.string('ip_address').nullable();
    table.boolean('active').defaultTo(true);
    table.timestamp('last_activity').defaultTo(knex.fn.now());
    table.timestamp('expires_at').nullable();
    table.timestamp('ended_at').nullable();
    table.timestamps(true, true);
  });

  // Login attempts (successful and failed)
  await knex.schema.createTableIfNotExists('login_attempts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.text('email').notNullable();
    table.uuid('user_id').nullable();
    table.string('ip_address').nullable();
    table.text('user_agent').nullable();
    table.boolean('success').defaultTo(false);
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.timestamps(true, true);
  });

  // Two-factor auth state and codes per user
  await knex.schema.createTableIfNotExists('two_factor_auth', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable();
    table.string('email').nullable();
    table.boolean('enabled').defaultTo(false);
    table.string('code').nullable();
    table.boolean('verified').defaultTo(false);
    table.timestamp('expires_at').nullable();
    table.timestamp('enabled_at').nullable();
    table.timestamp('disabled_at').nullable();
    table.timestamp('verified_at').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('two_factor_auth');
  await knex.schema.dropTableIfExists('login_attempts');
  await knex.schema.dropTableIfExists('user_sessions');
  await knex.schema.dropTableIfExists('security_audit_logs');
};
