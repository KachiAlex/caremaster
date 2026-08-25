exports.up = function(knex) {
  return knex.schema.table('users', function(table) {
    // Make student-specific fields nullable so healthcare users can be inserted
    table.string('matric_number').nullable().alter();
    table.string('department').nullable().alter();
    table.string('level').nullable().alter();
    table.string('session').nullable().alter();
    
    // Add fields commonly used in Firestore but missing in PostgreSQL
    table.string('display_name').nullable();
    table.string('phone').nullable();
    table.string('photo_url').nullable();
    table.text('address').nullable();
    table.string('specialization').nullable();
    table.timestamp('date_of_birth').nullable();
    table.enum('gender', ['male', 'female', 'other']).nullable();
    table.string('emergency_contact_name').nullable();
    table.string('emergency_contact_phone').nullable();
    table.text('medical_history').nullable();
    table.string('insurance_provider').nullable();
    table.string('insurance_id').nullable();
    
    // Extend user_type enum to include healthcare roles
    // Note: PostgreSQL doesn't allow altering enum in place via Knex easily
    // We keep existing values and map new ones
  });
};

exports.down = function(knex) {
  return knex.schema.table('users', function(table) {
    table.string('matric_number').notNullable().alter();
    table.string('department').notNullable().alter();
    table.string('level').notNullable().alter();
    table.string('session').notNullable().alter();
    
    table.dropColumn('display_name');
    table.dropColumn('phone');
    table.dropColumn('photo_url');
    table.dropColumn('address');
    table.dropColumn('specialization');
    table.dropColumn('date_of_birth');
    table.dropColumn('gender');
    table.dropColumn('emergency_contact_name');
    table.dropColumn('emergency_contact_phone');
    table.dropColumn('medical_history');
    table.dropColumn('insurance_provider');
    table.dropColumn('insurance_id');
  });
};
