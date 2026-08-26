exports.up = async function(knex) {
  await knex.schema.table('institutions', (table) => {
    table.jsonb('settings').nullable();
    table.string('website').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('institutions', (table) => {
    table.dropColumn('website');
    table.dropColumn('settings');
  });
};
