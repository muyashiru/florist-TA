const mysql = require('mysql2/promise');
async function run() {
  const db = await mysql.createConnection({host:'localhost', user:'root', password:'', database:'florist'});
  const [rows] = await db.query("SELECT sku, name, price FROM products WHERE sku LIKE '%BAXL_005%' OR sku LIKE '%BAXXL_005%'");
  console.log(rows);
  process.exit();
}
run();
