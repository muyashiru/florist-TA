import { db } from './server/db.js';

async function check() {
    const [rows] = await db.query("SELECT sku, name, category, size FROM products WHERE sku LIKE '%LILY%' OR name LIKE '%Lily%' OR category LIKE '%Lily%'");
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
}
check();
