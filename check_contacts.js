import { db } from './server/db.js';

async function check() {
    const [rows] = await db.query("SELECT no_wa, name FROM contacts WHERE no_wa LIKE '%SANDBOX%'");
    console.log(rows);
    process.exit(0);
}
check();
