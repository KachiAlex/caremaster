exports.up = function(knex) {
  return knex.schema.createTable('schedules', table => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('firestore_id');
    table.string('institution_id');
    table.string('client_id');
    table.string('client_name');
    table.string('caregiver_id');
    table.string('caregiver_name');
    table.string('title');
    table.text('description');
    table.string('service_type');
    table.string('type');
    table.string('priority');
    table.date('schedule_date');
    table.date('end_date');
    table.time('start_time');
    table.time('end_time');
    table.text('comments');
    table.text('special_instructions');
    table.string('status').defaultTo('scheduled');
    table.boolean('is_assignment').defaultTo(false);
    table.string('assignment_id');
    table.jsonb('metadata').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('institution_id');
    table.index('caregiver_id');
    table.index('client_id');
    table.index('schedule_date');
    table.index('firestore_id');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('schedules');
};
