import { db } from './server/db.js';
async function run() {
  const skus = ['BAXL_005', 'ANGGAL_10', 'JAM_10', 'RT_04', 'RW_02', 'BARAT_4026'];
  const category = 'Bouquet Artificial';
  const size = '%xl%';
  
  let queryStr = 'SELECT sku, name, size FROM products WHERE (sku IN (?) OR category = ?) AND available = 1 AND (size LIKE ? OR sku IN (?)) ORDER BY (sku IN (?)) DESC, RAND() LIMIT 12';
  let queryParams = [skus, category, size, skus, skus];
  
  try {
    const [rows] = await db.query(queryStr, queryParams);
    console.log(rows);
  } catch (err) {
    console.error(err);
  }
  process.exit();
}
run();
