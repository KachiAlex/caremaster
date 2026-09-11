exports.up = async function(knex) {
  // Add columns to assignments table to store data sent by frontend
  await knex.schema.alterTable('assignments', (table) => {
    table.text('client_id').nullable();
    table.text('client_name').nullable();
    table.text('client_email').nullable();
    table.text('caregiver_name').nullable();
    table.text('caregiver_email').nullable();
    table.text('assigned_by').nullable();
    table.text('assigned_by_name').nullable();
    table.text('assignment_type').nullable();
    table.text('title').nullable();
    table.text('description').nullable();
    table.text('instructions').nullable();
    table.text('assigned_to_role').nullable();
    table.text('due_date').nullable();
    table.text('due_time').nullable();
  });

  // Copy existing patient_id values to client_id for backwards compatibility
  await knex.raw('UPDATE assignments SET client_id = patient_id::text WHERE patient_id IS NOT NULL AND client_id IS NULL');

  // Alter care_tasks.caregiver_id from uuid to text to support Firebase UIDs
  await knex.raw('ALTER TABLE care_tasks ALTER COLUMN caregiver_id TYPE text USING caregiver_id::text');
  await knex.raw('ALTER TABLE care_tasks ALTER COLUMN patient_id TYPE text USING patient_id::text');

  // Alter assignments.caregiver_id from uuid to text to support Firebase UIDs
  await knex.raw('ALTER TABLE assignments ALTER COLUMN caregiver_id TYPE text USING caregiver_id::text');
  await knex.raw('ALTER TABLE assignments ALTER COLUMN patient_id TYPE text USING patient_id::text');

  // Alter clients.user_id from uuid to text to support Firebase UIDs
  // First drop the foreign key constraint, then alter the column, then recreate the constraint
  await knex.raw('ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_user_id_foreign');
  await knex.raw('ALTER TABLE clients ALTER COLUMN user_id TYPE text USING user_id::text');
  // Note: We don't recreate the foreign key since users.id is uuid and we're converting to text
  // This is acceptable for Firebase UID compatibility
};

exports.down = async function(knex) {
  await knex.schema.alterTable('assignments', (table) => {
    table.dropColumn('client_id');
    table.dropColumn('client_name');
    table.dropColumn('client_email');
    table.dropColumn('caregiver_name');
    table.dropColumn('caregiver_email');
    table.dropColumn('assigned_by');
    table.dropColumn('assigned_by_name');
    table.dropColumn('assignment_type');
    table.dropColumn('title');
    table.dropColumn('description');
    table.dropColumn('instructions');
    table.dropColumn('assigned_to_role');
    table.dropColumn('due_date');
    table.dropColumn('due_time');
  });

  await knex.raw('ALTER TABLE care_tasks ALTER COLUMN caregiver_id TYPE uuid USING caregiver_id::uuid');
  await knex.raw('ALTER TABLE care_tasks ALTER COLUMN patient_id TYPE uuid USING patient_id::uuid');
  await knex.raw('ALTER TABLE assignments ALTER COLUMN caregiver_id TYPE uuid USING caregiver_id::uuid');
  await knex.raw('ALTER TABLE assignments ALTER COLUMN patient_id TYPE uuid USING patient_id::uuid');
  
  // Restore the foreign key constraint before changing user_id back to uuid
  await knex.raw('ALTER TABLE clients ADD CONSTRAINT clients_user_id_foreign FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL');
  await knex.raw('ALTER TABLE clients ALTER COLUMN user_id TYPE uuid USING user_id::uuid');
};
