const fs = require('fs');
const path = '/var/www/caremaster-backend/routes/data.js';
let content = fs.readFileSync(path, 'utf8');

// Add console.error before the logger.error in the create route
content = content.replace(
    "logger.error(`Failed to create ${req.params.table}:`, error);\n    res.status(500).json({ success: false, message: 'Failed to create record' });",
    "console.error('CREATE ERROR for', req.params.table, ':', error.message, 'DETAIL:', error.detail || 'none', 'DATA:', JSON.stringify(data));\n    logger.error(`Failed to create ${req.params.table}:`, error);\n    res.status(500).json({ success: false, message: 'Failed to create record', debug: error.message });"
);

fs.writeFileSync(path, content);
console.log('Debug logging added.');
