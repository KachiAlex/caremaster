const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let content = fs.readFileSync(path, 'utf8');

const oldStr = `  } catch (error) {
    logger.error(\`Failed to create \${req.params.table}:\`, error);
    res.status(500).json({ success: false, message: 'Failed to create record' });
  }
});

// PUT /api/data/:table/:id - Update record`;

const newStr = `  } catch (error) {
    console.error('CREATE ERROR for', req.params.table, ':', error.message, 'DETAIL:', error.detail || 'none');
    res.status(500).json({ success: false, message: 'Failed to create record', debug: error.message, detail: error.detail || null });
  }
});

// PUT /api/data/:table/:id - Update record`;

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync(path, content);
  console.log('Patched successfully.');
} else {
  console.log('Pattern not found. Trying alternate...');
  // Try a simpler replacement
  content = content.replace(
    "logger.error(`Failed to create ${req.params.table}:`, error);\n    res.status(500).json({ success: false, message: 'Failed to create record' });",
    "console.error('CREATE ERROR for', req.params.table, ':', error.message, 'DETAIL:', error.detail || 'none');\n    res.status(500).json({ success: false, message: 'Failed to create record', debug: error.message, detail: error.detail || null });"
  );
  fs.writeFileSync(path, content);
  console.log('Alternate patch applied.');
}
