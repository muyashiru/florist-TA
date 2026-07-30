import { askQwenAI } from './server/ai.js';
import { db } from './server/db.js';

async function test() {
    const no_wa = "0895339549364_TEST_15";
    
    // Clear history
    await db.query('DELETE FROM contacts WHERE no_wa = ?', [no_wa]);
    await db.query('DELETE FROM messages WHERE no_wa = ?', [no_wa]);
    
    // Insert contact
    await db.query('INSERT INTO contacts (no_wa, name) VALUES (?, ?)', [no_wa, 'Refa']);
    
    const lastMsg = "saya mau pesan 1 BAL_012 dikirim untuk tanggal 4 agustus jam 12 siang, alamatnya Jl. H. Topek 1 No.14 (40242), nama penerima dan nomor penerimanya Refa 089932212313 notesnya : Selamat Sayang";
    
    console.log("Memulai simulasi AI Skenario 15 (BAL_012)...");
    const res = await askQwenAI(no_wa, lastMsg);
    console.log("HASIL AI:", res);
    process.exit(0);
}
test();
