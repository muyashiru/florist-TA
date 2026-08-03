const fs = require('fs');
const path = 'd:\\Projectku\\florist - TA\\server\\index.js';
let content = fs.readFileSync(path, 'utf8');
content = content.replace(/\\\`/g, '`');
fs.writeFileSync(path, content);
console.log('Fixed backticks');
