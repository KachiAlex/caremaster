exports.up = function(knex) {
  return knex.schema.createTable('institutions', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('email').unique().notNullable();
    table.string('phone');
    table.string('address');
    table.string('city');
    table.string('state');
    table.string('country');
    table.string('zip_code');
    table.string('license_key').unique();
    table.string('plan').defaultTo('basic');
    table.integer('seats').defaultTo(10);
    table.boolean('active').defaultTo(true);
    table.timestamp('license_starts_at');
    table.timestamp('license_ends_at');
    table.string('status').defaultTo('active');
    table.json('features');
    table.timestamps(true, true);
    
    table.index(['email']);
    table.index(['license_key']);
    table.index(['active']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('institutions');
};
