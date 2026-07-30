import { db } from './server/db.js';
async function clean() {
    await db.query("DELETE FROM contacts WHERE no_wa LIKE '%_TEST_%'");
    await db.query("DELETE FROM messages WHERE no_wa LIKE '%_TEST_%'");
    console.log('✅ Data dummy berhasil dihapus!');
    process.exit(0);
}
clean();
