const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Find and replace the POST route's data line (around line 333)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));')) {
    // Check if the next line is "// Remove id if present so DB generates one"
    if (i + 1 < lines.length && lines[i + 1].includes('Remove id if present')) {
      lines[i] = lines[i].replace('const data =', 'let data =');
      // Insert applyFieldAliases after the delete data.id line
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        if (lines[j].includes('delete data.id;')) {
          lines[j] = lines[j] + '\n    data = applyFieldAliases(tableName, data);';
          break;
        }
      }
      console.log(`Patched POST route at line ${i + 1}`);
      break;
    }
  }
}

// Find and replace the PUT route's data line (around line 361)
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('const data = serializeJsonValues(filterWritableFields(tableName, mapToSnakeCase(req.body)));')) {
    // This is the PUT route (second occurrence)
    if (i + 1 < lines.length && lines[i + 1].includes('delete data.id;')) {
      lines[i] = lines[i].replace('const data =', 'let data =');
      lines[i + 1] = lines[i + 1] + '\n    data = applyFieldAliases(tableName, data);';
      console.log(`Patched PUT route at line ${i + 1}`);
      break;
    }
  }
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Done.');
