/**
 * Add account lockout columns to the users table.
 *
 * - failed_login_count: tracks consecutive failed login attempts
 * - locked_until: timestamp until which the account is locked
 *
 * This supports the account lockout security feature (H3) which
 * temporarily locks an account after repeated failed login attempts
 * to prevent brute-force password attacks.
 */

exports.up = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.integer('failed_login_count').defaultTo(0).notNullable();
    table.timestamp('locked_until').nullable();
  });
};

exports.down = function (knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('failed_login_count');
    table.dropColumn('locked_until');
  });
};
