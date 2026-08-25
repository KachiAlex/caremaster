exports.up = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.json('roles').nullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.table('users', (table) => {
    table.dropColumn('roles');
  });
};
