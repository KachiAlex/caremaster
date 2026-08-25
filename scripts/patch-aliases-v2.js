const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Insert FIELD_ALIASES and applyFieldAliases function before filterWritableFields
const aliasBlock = `
// Map frontend field names to actual DB column names where they differ
const FIELD_ALIASES = {
  calls: { 'recipient_id': 'receiver_id' },
  messages: { 'recipient_id': 'receiver_id' },
  conversations: { 'last_message_time': 'last_message_at', 'last_message': 'last_message_preview', 'conversation_type': 'type' },
};

function applyFieldAliases(tableName, data) {
  const aliases = FIELD_ALIASES[tableName];
  if (!aliases) return data;
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    const mappedKey = aliases[key] || key;
    if (result[mappedKey] === undefined) {
      result[mappedKey] = value;
    }
  }
  return result;
}
`;

// Insert before filterWritableFields
content = content.replace(
  "function filterWritableFields(table, data) {",
  aliasBlock + "\nfunction filterWritableFields(table, data) {"
);

// 2. Modify the POST route to apply aliases after filtering
content = content.replace(
  "const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    // Remove id if present so DB generates one\n    delete data.id;",
  "let data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    data = applyFieldAliases(tableName, data);\n    // Remove id if present so DB generates one\n    delete data.id;"
);

// 3. Modify the PUT route to apply aliases after filtering
content = content.replace(
  "const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    delete data.id;\n    delete data.created_at;",
  "let data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));\n    data = applyFieldAliases(tableName, data);\n    delete data.id;\n    delete data.created_at;"
);

fs.writeFileSync(path, content);

// Verify
if (content.includes('FIELD_ALIASES') && content.includes('applyFieldAliases')) {
  console.log('SUCCESS: FIELD_ALIASES and applyFieldAliases added.');
} else {
  console.log('FAILED: Pattern not found.');
}
