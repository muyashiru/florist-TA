import { db } from './server/db.js';

async function mergeSandbox() {
    try {
        await db.query("UPDATE messages SET no_wa = '0895402765380_SANDBOX' WHERE no_wa = '0895339549364_SANDBOX'");
        await db.query("DELETE FROM contacts WHERE no_wa = '0895339549364_SANDBOX'");
        console.log("Berhasil menggabungkan kontak Sandbox.");
    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}
mergeSandbox();
