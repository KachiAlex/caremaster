/**
 * Add `source` column to health-record tables so admin/doctor/caregiver
 * can distinguish patient self-reported records from staff-entered ones.
 *
 * Values: 'patient' | 'caregiver' | 'doctor' | 'nurse' | 'admin' | 'system'
 *
 * Also adds `recorded_by` to tables that don't have it yet (medication_logs,
 * care_logs) so we always know WHO entered the record regardless of source.
 */
exports.up = function(knex) {
  return knex.schema
    // vital_signs — already has recorded_by, just add source
    .alterTable('vital_signs', function(table) {
      table.string('source', 20).defaultTo('system');
      table.index('source');
    })
    // emergency_alerts — already has triggered_by, just add source
    .alterTable('emergency_alerts', function(table) {
      table.string('source', 20).defaultTo('system');
      table.index('source');
    })
    // medication_logs — has caregiver_id, add recorded_by + source
    .alterTable('medication_logs', function(table) {
      table.uuid('recorded_by').nullable();
      table.string('source', 20).defaultTo('system');
      table.index('source');
    })
    // care_logs — has caregiver_id, add recorded_by + source
    .alterTable('care_logs', function(table) {
      table.string('recorded_by').nullable();
      table.string('source', 20).defaultTo('system');
      table.index('source');
    });
};

exports.down = function(knex) {
  return knex.schema
    .alterTable('care_logs', function(table) {
      table.dropColumn('source');
      table.dropColumn('recorded_by');
    })
    .alterTable('medication_logs', function(table) {
      table.dropColumn('source');
      table.dropColumn('recorded_by');
    })
    .alterTable('emergency_alerts', function(table) {
      table.dropColumn('source');
    })
    .alterTable('vital_signs', function(table) {
      table.dropColumn('source');
    });
};
