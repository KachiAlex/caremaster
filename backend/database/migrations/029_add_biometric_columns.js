exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.boolean('biometric_enabled').defaultTo(false);
    table.string('biometric_credential_id').nullable();
    table.string('two_factor_phone').nullable();
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('biometric_enabled');
    table.dropColumn('biometric_credential_id');
    table.dropColumn('two_factor_phone');
  });
};
