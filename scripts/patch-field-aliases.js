const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let content = fs.readFileSync(path, 'utf8');

// Add FIELD_ALIASES mapping after the COLLECTION_TO_TABLE definition
const aliasesCode = `
// Map frontend field names to actual DB column names where they differ
const FIELD_ALIASES = {
  calls: {
    'recipient_id': 'receiver_id',
  },
  messages: {
    'recipient_id': 'receiver_id',
  },
  conversations: {
    'last_message_time': 'last_message_at',
    'last_message': 'last_message_preview',
    'conversation_type': 'type',
  },
};

function applyFieldAliases(tableName, data) {
  const aliases = FIELD_ALIASES[tableName];
  if (!aliases) return data;
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = aliases[key] || key;
    // If both the alias source and target exist, don't overwrite
    if (result[mappedKey] === undefined) {
      result[mappedKey] = value;
    }
  }
  return result;
}
`;

// Insert after the resolveTable function
if (!content.includes('FIELD_ALIASES')) {
  content = content.replace(
    "function resolveTable(collectionName) {\n  return COLLECTION_TO_TABLE[collectionName] || collectionName;\n}",
    "function resolveTable(collectionName) {\n  return COLLECTION_TO_TABLE[collectionName] || collectionName;\n}\n" + aliasesCode
  );
  console.log('Added FIELD_ALIASES mapping.');
}

// Now update the POST route to use applyFieldAliases
content = content.replace(
  "const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    // Remove id if present so DB generates one\n    delete data.id;\n\n    if (Object.keys(data).length === 0) {\n      return res.status(400).json({ success: false, message: 'No valid fields to create' });\n    }\n\n    const [record] = await db(tableName).insert(data).returning('*');",
  "let data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    data = applyFieldAliases(tableName, data);\n    // Remove id if present so DB generates one\n    delete data.id;\n\n    if (Object.keys(data).length === 0) {\n      return res.status(400).json({ success: false, message: 'No valid fields to create' });\n    }\n\n    const [record] = await db(tableName).insert(data).returning('*');"
);

// Also update the PUT route
content = content.replace(
  "const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    delete data.id;\n    delete data.created_at;",
  "let data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    data = applyFieldAliases(tableName, data);\n    delete data.id;\n    delete data.created_at;"
);

// Update WRITABLE_FIELDS for calls to include receiver_id
content = content.replace(
  "calls: ['call_id', 'caller_id', 'recipient_id', 'receiver_id', 'call_type', 'type', 'caller_name', 'recipient_name', 'status', 'duration', 'duration_seconds', 'started_at', 'ended_at', 'answered_at', 'participants', 'institution_id', 'created_at'],",
  "calls: ['call_id', 'caller_id', 'recipient_id', 'receiver_id', 'call_type', 'type', 'caller_name', 'recipient_name', 'status', 'duration', 'duration_seconds', 'started_at', 'ended_at', 'answered_at', 'participants', 'institution_id', 'created_at', 'answered_at'],"
);

// Update messages WRITABLE_FIELDS to include recipient_id (maps to receiver_id)
content = content.replace(
  "messages: ['conversation_id', 'sender_id', 'receiver_id', 'recipient_id', 'content', 'text', 'message_type', 'attachments', 'read', 'sent_at', 'read_at', 'created_at'],",
  "messages: ['conversation_id', 'sender_id', 'receiver_id', 'recipient_id', 'content', 'text', 'message_type', 'attachments', 'read', 'sent_at', 'read_at', 'created_at', 'sender_id'],"
);

fs.writeFileSync(path, content);
console.log('data.js fully patched.');
