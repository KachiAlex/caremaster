require('dotenv').config();
const config = require('./knexfile');
const db = require('knex')(config.production);

(async () => {
  try {
    const cols = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'caregivers' ORDER BY ordinal_position");
    console.log('=== caregivers columns ===');
    cols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    const userCols = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position");
    console.log('\n=== users columns ===');
    userCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    const profileCols = await db.raw("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'caregiver_profiles' ORDER BY ordinal_position");
    console.log('\n=== caregiver_profiles columns ===');
    profileCols.rows.forEach(r => console.log(`  ${r.column_name} (${r.data_type})`));

    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
