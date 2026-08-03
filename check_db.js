import { db } from './server/db.js';

async function check() {
    const [rows] = await db.query("DESCRIBE orders");
    console.log(rows);
    process.exit(0);
}
check();
