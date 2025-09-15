const fs = require('fs');
const file = fs.readFileSync('log.json', 'utf-8');
try {
  JSON.parse(file);
  console.log('Valid JSON');
} catch(e) {
  console.error('Invalid JSON:', e.message);
}