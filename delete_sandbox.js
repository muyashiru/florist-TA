import { db } from './server/db.js';

async function run() {
  try {
    const targetNo = '62895339549364_SANDBOX';
    await db.query("DELETE FROM messages WHERE no_wa = ?", [targetNo]);
    await db.query("DELETE FROM contacts WHERE no_wa = ?", [targetNo]);
    console.log("Berhasil dihapus!");
  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}
run();
