const knex = require('knex')(require('./knexfile').development);

(async () => {
  const tables = ['conversations', 'messages', 'calls', 'call_notifications', 'signaling'];
  for (const t of tables) {
    try {
      const exists = await knex.schema.hasTable(t);
      if (!exists) {
        console.log(`\n=== ${t}: TABLE DOES NOT EXIST ===`);
        continue;
      }
      const cols = await knex('information_schema.columns')
        .where({ table_name: t })
        .select('column_name', 'data_type', 'is_nullable')
        .orderBy('ordinal_position');
      console.log(`\n=== ${t} columns ===`);
      cols.forEach(c => console.log(`  ${c.column_name} (${c.data_type}, nullable=${c.is_nullable})`));
    } catch (e) {
      console.log(`\n=== ${t}: ERROR: ${e.message} ===`);
    }
  }
  process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
