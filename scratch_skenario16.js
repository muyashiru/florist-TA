import { askQwenAI } from './server/ai.js';
import { db } from './server/db.js';

async function test() {
    const no_wa = "0895339549364_TEST_16";
    
    // Clear history
    await db.query('DELETE FROM contacts WHERE no_wa = ?', [no_wa]);
    await db.query('DELETE FROM messages WHERE no_wa = ?', [no_wa]);
    
    // Insert contact
    await db.query('INSERT INTO contacts (no_wa, name) VALUES (?, ?)', [no_wa, 'Refa']);
    
    // Insert messages
    const msgs = [
        { sender: 'customer', text: 'hallo min' },
        { sender: 'ai', text: 'Halo Kak! Selamat pagi 🌸...' },
        { sender: 'customer', text: 'ada rekomendasi bunga harga 300rb an ga' },
        { sender: 'ai', text: 'Tentu Kak, untuk budget Rp 300.000...' },
        { sender: 'customer', text: 'saya mau pesan 1 yang XL 018 dikirim untuk tanggal 4 agustus jam 12 siang, alamatnya Jl. H. Topek 1 No.14 (40242), nama penerima dan nomor penerimanya Refa 089932212313 notesnya : Selamat Sayang' }
    ];
    
    for (const m of msgs) {
        await db.query('INSERT INTO messages (no_wa, sender, message_text) VALUES (?, ?, ?)', [no_wa, m.sender, m.text]);
    }
    
    console.log("Memulai simulasi AI Skenario 16...");
    const res = await askQwenAI(no_wa, msgs[4].text);
    console.log("HASIL AI:", res);
    process.exit(0);
}
test();
