import { db } from './server/db.js';

async function run() {
  try {
    const sku = ['BAXL_005'];
    const [rows] = await db.query("SELECT sku, name FROM products WHERE (sku IN (?) OR category = 'Bouquet Artificial') AND available = 1 ORDER BY (sku IN (?)) DESC, RAND() LIMIT 12", [sku, sku]);
    console.log(rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
