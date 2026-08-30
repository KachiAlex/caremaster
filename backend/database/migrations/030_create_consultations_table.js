exports.up = function(knex) {
  return knex.schema.createTable('consultations', function(table) {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('client_id').notNullable();
    table.string('client_name').defaultTo('');
    table.string('doctor_id').notNullable();
    table.string('doctor_name').defaultTo('');
    table.string('institution_id').defaultTo('');
    table.string('consultation_type').defaultTo('review');
    table.timestamp('consultation_date').defaultTo(knex.fn.now());
    table.text('chief_complaint').defaultTo('');
    table.text('subjective').defaultTo('');
    table.text('objective').defaultTo('');
    table.text('assessment').defaultTo('');
    table.text('plan').defaultTo('');
    table.jsonb('vital_signs').nullable();
    table.jsonb('related_medical_reports').defaultTo('[]');
    table.jsonb('related_care_logs').defaultTo('[]');
    table.jsonb('related_prescriptions').defaultTo('[]');
    table.boolean('follow_up_required').defaultTo(false);
    table.timestamp('follow_up_date').nullable();
    table.text('follow_up_notes').defaultTo('');
    table.text('notes').defaultTo('');
    table.text('private_notes').defaultTo('');
    table.string('status').defaultTo('completed');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for common queries
    table.index('client_id');
    table.index('doctor_id');
    table.index('institution_id');
    table.index('consultation_date');
    table.index('status');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('consultations');
};
