exports.up = async function(knex) {
  await knex.schema.createTable('medication_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('caregiver_id').nullable();
    table.uuid('institution_id').nullable();
    table.uuid('medication_id').nullable();
    table.string('medication_name').nullable();
    table.string('status').defaultTo('pending'); // taken, missed, skipped, pending, error
    table.timestamp('scheduled_time').nullable();
    table.timestamp('taken_time').nullable();
    table.string('dosage').nullable();
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('medication_logs');
};
