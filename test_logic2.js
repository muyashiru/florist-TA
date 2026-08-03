import { db } from './server/db.js';
async function test() {
    const no_wa = '08997778888_SANDBOX';
    const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
    console.log("Number of messages:", rows.length);
    for (const [index, row] of rows.entries()) {
        console.log(`\n--- Message ${index} ---`);
        console.log(row.message_text.substring(0, 150) + "...");
    }
    process.exit(0);
}
test();
