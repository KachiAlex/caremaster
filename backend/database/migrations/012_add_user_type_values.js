exports.up = async function(knex) {
  // PostgreSQL enums can't be easily altered. Convert to text with check constraint.
  await knex.raw(`
    ALTER TABLE users 
    ALTER COLUMN user_type DROP DEFAULT;
  `);
  
  await knex.raw(`
    ALTER TABLE users 
    ALTER COLUMN user_type TYPE text USING user_type::text;
  `);
  
  await knex.raw(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_user_type_check;
  `);
  
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT users_user_type_check 
    CHECK (user_type IN (
      'student', 'bursar', 'admin', 
      'super-admin', 'caregiver', 'doctor', 'nurse', 'pharmacist', 
      'client', 'elderly', 'patient', 'partner', 'institution_admin'
    ));
  `);
  
  await knex.raw(`
    ALTER TABLE users 
    ALTER COLUMN user_type SET DEFAULT 'student';
  `);
};

exports.down = async function(knex) {
  await knex.raw(`
    ALTER TABLE users 
    DROP CONSTRAINT IF EXISTS users_user_type_check;
  `);
  
  // Note: converting back to enum is complex; this is a best-effort rollback
  await knex.raw(`
    ALTER TABLE users 
    ALTER COLUMN user_type TYPE text USING user_type::text;
  `);
  
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT users_user_type_check 
    CHECK (user_type IN ('student', 'bursar', 'admin'));
  `);
};
