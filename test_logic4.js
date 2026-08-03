import { db } from './server/db.js';
async function test() {
    const no_wa = '0895339549364_SANDBOX';
    const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
    console.log(rows[6].message_text);
    process.exit(0);
}
test();
