import { db } from './server/db.js';
async function run() {
  const [rows] = await db.query('SELECT sku, price FROM products WHERE sku = ?', ['BAXL_005']);
  console.log(rows);
  process.exit();
}
run();
