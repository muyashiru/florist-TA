import { db } from './server/db.js';
db.query('SELECT sku, name, price FROM products WHERE sku LIKE "%080%" OR name LIKE "%080%"').then(r => console.log(r[0])).catch(console.error).finally(() => process.exit(0));
