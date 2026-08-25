/**
 * Fix backend data.js route for messaging/call/signaling flows.
 * 1. Create signaling table
 * 2. Add signaling to valid tables
 * 3. Fix WRITABLE_FIELDS for conversations, messages, calls, call_notifications
 * 4. Add field name mapping where camelCase→snake_case doesn't match DB columns
 */
const knex = require('knex')(require('./knexfile').development);

(async () => {
  // 1. Create signaling table
  console.log('Creating signaling table...');
  const signalingExists = await knex.schema.hasTable('signaling');
  if (!signalingExists) {
    await knex.schema.createTable('signaling', (t) => {
      t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      t.string('firestore_id').nullable();
      t.string('call_id').notNullable();
      t.string('type').nullable(); // 'offer', 'answer', 'ice-candidate'
      t.text('sdp').nullable();
      t.jsonb('candidate').nullable();
      t.string('from_user_id').nullable();
      t.timestamp('timestamp').nullable();
      t.timestamp('created_at').defaultTo(knex.fn.now());
    });
    console.log('signaling table created.');
  } else {
    console.log('signaling table already exists.');
  }

  // 2. Add missing columns to conversations if needed
  const convCols = await knex('information_schema.columns').where({ table_name: 'conversations' }).pluck('column_name');
  if (!convCols.includes('conversation_type')) {
    await knex.schema.table('conversations', (t) => {
      t.string('conversation_type').nullable();
    });
    console.log('Added conversation_type to conversations.');
  }

  // 3. Add missing columns to messages if needed
  const msgCols = await knex('information_schema.columns').where({ table_name: 'messages' }).pluck('column_name');
  if (!msgCols.includes('text')) {
    await knex.schema.table('messages', (t) => {
      t.text('text').nullable();
    });
    console.log('Added text column to messages.');
  }

  // 4. Add missing columns to calls if needed
  const callCols = await knex('information_schema.columns').where({ table_name: 'calls' }).pluck('column_name');
  if (!callCols.includes('call_id')) {
    await knex.schema.table('calls', (t) => {
      t.string('call_id').nullable();
      t.string('call_type').nullable();
      t.string('caller_name').nullable();
      t.string('recipient_name').nullable();
      t.string('recipient_id').nullable();
      t.timestamp('answered_at').nullable();
    });
    console.log('Added missing columns to calls.');
  }

  // 5. Add timestamp column to call_notifications if missing
  const notifCols = await knex('information_schema.columns').where({ table_name: 'call_notifications' }).pluck('column_name');
  if (!notifCols.includes('timestamp')) {
    await knex.schema.table('call_notifications', (t) => {
      t.timestamp('timestamp').nullable();
    });
    console.log('Added timestamp to call_notifications.');
  }

  console.log('\nAll schema fixes applied.');
  process.exit(0);
})().catch(e => { console.error('Error:', e); process.exit(1); });
