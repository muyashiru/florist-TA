import { db } from './server/db.js';

async function check() {
    try {
        const [rows] = await db.query("SELECT * FROM orders ORDER BY created_at DESC LIMIT 3");
        console.log("Orders:", rows);
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
check();
