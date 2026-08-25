exports.up = async function(knex) {
  // Appointments
  await knex.schema.createTable('appointments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('caregiver_id').nullable();
    table.uuid('doctor_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('title').nullable();
    table.text('description').nullable();
    table.string('type').nullable(); // consultation, follow-up, emergency
    table.string('status').defaultTo('scheduled'); // scheduled, completed, cancelled, no-show
    table.timestamp('scheduled_time').nullable();
    table.timestamp('start_time').nullable();
    table.timestamp('end_time').nullable();
    table.string('location').nullable();
    table.boolean('is_virtual').defaultTo(false);
    table.string('meeting_link').nullable();
    table.text('notes').nullable();
    table.string('priority').defaultTo('normal');
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Clients / Patients (extended profile beyond users table)
  await knex.schema.createTable('clients', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('client_id').unique().nullable(); // generated ID
    table.string('first_name').nullable();
    table.string('last_name').nullable();
    table.string('email').nullable();
    table.string('phone').nullable();
    table.text('address').nullable();
    table.date('date_of_birth').nullable();
    table.string('gender').nullable();
    table.string('blood_type').nullable();
    table.text('medical_history').nullable();
    table.text('allergies').nullable();
    table.string('emergency_contact_name').nullable();
    table.string('emergency_contact_phone').nullable();
    table.string('insurance_provider').nullable();
    table.string('insurance_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('status').defaultTo('active'); // active, archived, discharged
    table.string('care_level').nullable(); // independent, assisted, dependent
    table.timestamp('last_visit').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Caregiver profiles (extended data linked to users)
  await knex.schema.createTable('caregiver_profiles', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('SET NULL');
    table.string('license_number').nullable();
    table.string('specialization').nullable();
    table.integer('years_experience').nullable();
    table.string('availability').nullable(); // full-time, part-time, on-call
    table.string('employment_type').nullable(); // employee, contractor, volunteer
    table.decimal('hourly_rate', 10, 2).nullable();
    table.decimal('monthly_rate', 10, 2).nullable();
    table.string('currency').defaultTo('USD');
    table.string('payment_type').nullable(); // hourly, monthly, per-visit
    table.time('working_hours_start').nullable();
    table.time('working_hours_end').nullable();
    table.jsonb('working_days').nullable(); // array of days
    table.text('bio').nullable();
    table.string('status').defaultTo('active'); // active, inactive, pending, suspended
    table.uuid('institution_id').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Care Tasks
  await knex.schema.createTable('care_tasks', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('caregiver_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('title').notNullable();
    table.text('description').nullable();
    table.string('category').nullable(); // medication, hygiene, meal, exercise, transport, housekeeping
    table.string('priority').defaultTo('normal'); // low, normal, high, urgent
    table.string('status').defaultTo('pending'); // pending, in-progress, completed, cancelled
    table.timestamp('scheduled_date').nullable();
    table.time('scheduled_time').nullable();
    table.timestamp('completed_at').nullable();
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Assignments (patient-caregiver assignments)
  await knex.schema.createTable('assignments', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('caregiver_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('type').defaultTo('primary'); // primary, secondary, temporary
    table.string('status').defaultTo('active'); // active, completed, cancelled
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Messages / Communications
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('sender_id').nullable();
    table.uuid('recipient_id').nullable();
    table.string('sender_type').nullable(); // patient, caregiver, doctor, admin, system
    table.string('recipient_type').nullable();
    table.string('subject').nullable();
    table.text('content').notNullable();
    table.string('type').defaultTo('text'); // text, email, notification, alert
    table.string('priority').defaultTo('normal');
    table.string('status').defaultTo('unread'); // unread, read, archived
    table.uuid('related_entity_id').nullable(); // appointment, task, etc.
    table.string('related_entity_type').nullable();
    table.boolean('is_broadcast').defaultTo(false);
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Care Logs (daily care records)
  await knex.schema.createTable('care_logs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('caregiver_id').nullable();
    table.uuid('task_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('category').nullable(); // medication, meal, hygiene, vital, activity, incident
    table.text('notes').nullable();
    table.jsonb('details').nullable(); // structured data
    table.timestamp('log_time').nullable();
    table.string('mood').nullable();
    table.string('location').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Care Plans
  await knex.schema.createTable('care_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('created_by').nullable();
    table.uuid('institution_id').nullable();
    table.string('title').nullable();
    table.text('description').nullable();
    table.string('status').defaultTo('active'); // active, completed, discontinued
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.jsonb('goals').nullable();
    table.jsonb('interventions').nullable();
    table.jsonb('medications').nullable();
    table.jsonb('activities').nullable();
    table.jsonb('diet_plan').nullable();
    table.text('special_instructions').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Vital Signs
  await knex.schema.createTable('vital_signs', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('recorded_by').nullable();
    table.uuid('institution_id').nullable();
    table.timestamp('recorded_at').nullable();
    table.decimal('temperature', 5, 2).nullable();
    table.string('temperature_unit').defaultTo('celsius');
    table.integer('heart_rate').nullable();
    table.integer('respiratory_rate').nullable();
    table.string('blood_pressure_systolic').nullable();
    table.string('blood_pressure_diastolic').nullable();
    table.decimal('oxygen_saturation', 5, 2).nullable();
    table.decimal('weight', 8, 2).nullable();
    table.string('weight_unit').defaultTo('kg');
    table.decimal('height', 8, 2).nullable();
    table.string('height_unit').defaultTo('cm');
    table.decimal('blood_glucose', 6, 2).nullable();
    table.string('pain_level').nullable();
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Prescriptions
  await knex.schema.createTable('prescriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('doctor_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('medication_name').notNullable();
    table.string('dosage').nullable();
    table.string('frequency').nullable(); // e.g., "twice daily"
    table.string('route').nullable(); // oral, iv, topical, etc.
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.text('instructions').nullable();
    table.text('side_effects').nullable();
    table.string('status').defaultTo('active'); // active, completed, discontinued
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Diagnostics / Lab Tests
  await knex.schema.createTable('diagnostics', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('ordered_by').nullable();
    table.uuid('institution_id').nullable();
    table.string('test_name').notNullable();
    table.string('test_type').nullable(); // blood, urine, imaging, etc.
    table.string('status').defaultTo('pending'); // pending, in-progress, completed, cancelled
    table.date('ordered_date').nullable();
    table.date('scheduled_date').nullable();
    table.timestamp('completed_at').nullable();
    table.text('results').nullable();
    table.text('notes').nullable();
    table.string('priority').defaultTo('normal');
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Notifications
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable();
    table.string('title').nullable();
    table.text('message').notNullable();
    table.string('type').defaultTo('info'); // info, warning, alert, success
    table.string('category').nullable(); // appointment, task, message, system
    table.string('status').defaultTo('unread'); // unread, read, dismissed
    table.uuid('related_entity_id').nullable();
    table.string('related_entity_type').nullable();
    table.boolean('is_urgent').defaultTo(false);
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Attendance
  await knex.schema.createTable('attendance', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').nullable();
    table.uuid('institution_id').nullable();
    table.date('date').nullable();
    table.time('check_in').nullable();
    table.time('check_out').nullable();
    table.string('status').defaultTo('present'); // present, absent, late, on-leave
    table.text('notes').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Billing / Invoices
  await knex.schema.createTable('invoices', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('institution_id').nullable();
    table.string('invoice_number').unique().nullable();
    table.string('status').defaultTo('pending'); // pending, paid, overdue, cancelled
    table.decimal('amount', 12, 2).nullable();
    table.decimal('tax_amount', 12, 2).nullable();
    table.decimal('discount', 12, 2).nullable();
    table.decimal('total_amount', 12, 2).nullable();
    table.string('currency').defaultTo('USD');
    table.date('issue_date').nullable();
    table.date('due_date').nullable();
    table.date('paid_date').nullable();
    table.string('payment_method').nullable();
    table.text('description').nullable();
    table.jsonb('line_items').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Subscription / Billing Plans
  await knex.schema.createTable('billing_plans', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.text('description').nullable();
    table.string('type').nullable(); // monthly, quarterly, yearly
    table.decimal('amount', 12, 2).nullable();
    table.string('currency').defaultTo('USD');
    table.string('status').defaultTo('active');
    table.jsonb('features').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Emergency Alerts
  await knex.schema.createTable('emergency_alerts', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('triggered_by').nullable();
    table.uuid('institution_id').nullable();
    table.string('type').nullable(); // fall, medical, sos, panic
    table.string('severity').defaultTo('high'); // low, medium, high, critical
    table.string('status').defaultTo('active'); // active, resolved, false-alarm
    table.text('description').nullable();
    table.text('location').nullable();
    table.timestamp('resolved_at').nullable();
    table.uuid('resolved_by').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Inventory
  await knex.schema.createTable('inventory', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.string('name').notNullable();
    table.string('sku').nullable();
    table.string('category').nullable(); // medication, equipment, supply
    table.text('description').nullable();
    table.integer('quantity').defaultTo(0);
    table.integer('min_stock').defaultTo(0);
    table.string('unit').nullable();
    table.decimal('unit_price', 10, 2).nullable();
    table.string('supplier').nullable();
    table.date('expiry_date').nullable();
    table.string('status').defaultTo('active');
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Pharmacy / Medications
  await knex.schema.createTable('medications', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('name').notNullable();
    table.string('generic_name').nullable();
    table.string('brand_name').nullable();
    table.string('category').nullable();
    table.text('description').nullable();
    table.text('side_effects').nullable();
    table.text('contraindications').nullable();
    table.string('dosage_form').nullable(); // tablet, capsule, liquid, injection
    table.string('strength').nullable();
    table.string('unit').nullable();
    table.integer('stock_quantity').defaultTo(0);
    table.decimal('price', 10, 2).nullable();
    table.string('currency').defaultTo('USD');
    table.string('status').defaultTo('active');
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Patient Reports
  await knex.schema.createTable('patient_reports', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('patient_id').nullable();
    table.uuid('created_by').nullable();
    table.uuid('institution_id').nullable();
    table.string('title').nullable();
    table.string('type').nullable(); // medical, care, incident, assessment
    table.text('content').nullable();
    table.jsonb('sections').nullable();
    table.string('status').defaultTo('draft'); // draft, submitted, approved
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });

  // Subscriptions
  await knex.schema.createTable('subscriptions', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('institution_id').nullable();
    table.uuid('plan_id').nullable().references('id').inTable('billing_plans').onDelete('SET NULL');
    table.string('status').defaultTo('active'); // active, cancelled, expired, suspended
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.date('next_billing_date').nullable();
    table.string('payment_method').nullable();
    table.jsonb('metadata').nullable();
    table.timestamps(true, true);
  });
};

exports.down = async function(knex) {
  // Drop in reverse order to avoid FK constraints
  await knex.schema.dropTableIfExists('subscriptions');
  await knex.schema.dropTableIfExists('patient_reports');
  await knex.schema.dropTableIfExists('medications');
  await knex.schema.dropTableIfExists('inventory');
  await knex.schema.dropTableIfExists('emergency_alerts');
  await knex.schema.dropTableIfExists('billing_plans');
  await knex.schema.dropTableIfExists('invoices');
  await knex.schema.dropTableIfExists('attendance');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('diagnostics');
  await knex.schema.dropTableIfExists('prescriptions');
  await knex.schema.dropTableIfExists('vital_signs');
  await knex.schema.dropTableIfExists('care_plans');
  await knex.schema.dropTableIfExists('care_logs');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('assignments');
  await knex.schema.dropTableIfExists('care_tasks');
  await knex.schema.dropTableIfExists('caregiver_profiles');
  await knex.schema.dropTableIfExists('clients');
  await knex.schema.dropTableIfExists('appointments');
};
