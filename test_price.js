import { db } from './server/db.js';
async function test() {
    let itemName = "Bouquet Artificial XL 005 (BAXL_005)";
    let itemPrice = 150000;
    try {
        const skuMatch = itemName.match(/([A-Z]{3,4}_\d{3})/i);
        const queryStr = skuMatch ? skuMatch[1] : itemName;
        console.log("queryStr:", queryStr);
        const [pRows] = await db.query('SELECT price FROM products WHERE sku LIKE ? OR name LIKE ? LIMIT 1', [`%${queryStr}%`, `%${queryStr}%`]);
        if (pRows.length > 0 && pRows[0].price) {
            itemPrice = pRows[0].price;
        }
    } catch(e) { console.error(e) }
    console.log("itemPrice:", itemPrice);
    process.exit(0);
}
test();
