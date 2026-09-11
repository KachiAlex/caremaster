exports.up = async function(knex) {
  // Check if appointments table already exists
  const exists = await knex.schema.hasTable('appointments');
  if (exists) {
    console.log('Appointments table already exists, skipping creation');
    return;
  }

  // Appointments table (snake_case columns to match backend conventions)
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable().index(); // Changed from client_id to patient_id
    table.uuid('caregiver_id').nullable().index();
    table.uuid('doctor_id').nullable().index();
    table.uuid('institution_id').nullable().index();
    table.string('title').nullable();
    table.text('description').nullable();
    table.string('type').nullable(); // consultation, follow-up, emergency, care_service
    table.string('care_type').nullable(); // home_care, medical, personal_care, etc.
    table.string('status').defaultTo('scheduled').index(); // scheduled, confirmed, in_progress, completed, cancelled, no_show
    table.timestamp('scheduled_at').nullable().index();
    table.timestamp('started_at').nullable();
    table.timestamp('completed_at').nullable();
    table.string('priority').defaultTo('normal'); // low, normal, high, urgent
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Create indexes for common queries
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_caregiver_id ON appointments(caregiver_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_doctor_id ON appointments(doctor_id);
    CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
    CREATE INDEX IF NOT EXISTS idx_appointments_type ON appointments(type);
  `);

  console.log('Appointments table created successfully');
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('appointments');
};
