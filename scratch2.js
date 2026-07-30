import { db } from './db.js';
async function test() {
    const [rows] = await db.query('SELECT sku, name, price FROM products WHERE price IS NULL');
    console.log("NULL prices:", rows);
    process.exit(0);
}
test();
