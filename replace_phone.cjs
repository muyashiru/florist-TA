const fs = require('fs');
const path = require('path');

const OLD_NUMBER_1 = '0895339549364';
const OLD_NUMBER_2 = '081367931303';
const NEW_NUMBER = '0895402765380';

const filesToUpdate = [
    'Agentspec.md',
    'sandbox_scenarios.json',
    'src/pages/Dashboard.jsx',
    'server/ai.js',
    'server/index.js',
    'orders_map.json'
];

for (const file of filesToUpdate) {
    const fullPath = path.join(__dirname, file);
    if (fs.existsSync(fullPath)) {
        let content = fs.readFileSync(fullPath, 'utf8');
        content = content.replace(new RegExp(OLD_NUMBER_1, 'g'), NEW_NUMBER);
        content = content.replace(new RegExp(OLD_NUMBER_2, 'g'), NEW_NUMBER);
        fs.writeFileSync(fullPath, content);
        console.log(`Updated ${file}`);
    }
}
