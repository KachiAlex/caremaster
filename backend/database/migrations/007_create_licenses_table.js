exports.up = function(knex) {
  return knex.schema.createTable('licenses', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').references('id').inTable('institutions').onDelete('CASCADE');
    table.string('license_key').unique().notNullable();
    table.string('plan').defaultTo('basic');
    table.integer('seats').defaultTo(10);
    table.timestamp('starts_at').notNullable();
    table.timestamp('ends_at').notNullable();
    table.string('status').defaultTo('active');
    table.boolean('active').defaultTo(true);
    table.json('features');
    table.timestamp('suspended_at');
    table.timestamp('activated_at');
    table.timestamps(true, true);
    
    table.index(['institution_id']);
    table.index(['license_key']);
    table.index(['active']);
    table.index(['status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('licenses');
};
