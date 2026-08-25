exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('firebase_uid').unique().index();
    table.uuid('institution_id').references('id').inTable('institutions').onDelete('SET NULL');
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.dropColumn('firebase_uid');
    table.dropColumn('institution_id');
  });
};
