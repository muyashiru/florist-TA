import { db } from './server/db.js';
async function test() {
    const no_wa = '0895339549364_SANDBOX';
    const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
    for (const [index, row] of rows.entries()) {
        const text = row.message_text;
        
        let destName = null;
        let itemName = "Bouquet Custom";
        
        if (text.includes('Detail Pesanan') || text.includes('Detail pesanan') || text.includes('DETAIL PESANAN') || text.includes('Silakan lengkapi data pemesanan')) {
            const nameMatch = text.match(/\*?(?:Penerima|Pemesan|Nama|Atas Nama|Nama Penerima|Nama Pemesan)\*?:\*?[ \t]*([^\n]+)/i);
            const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan)\*?:\*?[ \t]*([^\n]+)/i);
            if (nameMatch && nameMatch[1]) destName = nameMatch[1].replace(/\([0-9\s\+]+\)/g, '').replace(/\*/g, '').trim();
            if (itemMatch && itemMatch[1]) itemName = itemMatch[1].replace(/\*/g, '').trim();
            
            console.log(`\n--- Block 1 Match on msg [${index}] ---`);
            console.log("destName:", destName, "| itemName:", itemName);
            if (destName && destName !== "Customer Jale") {
                console.log("-> BREAKING LOOP from Block 1");
                break;
            }
        }
        
        if (text.includes('Nama penerima') || text.includes('Nama pemesan') || text.includes('Nama')) {
            const nameMatch = text.match(/Nama(?: penerima| pemesan|)\*?:\*?[ \t]*([^\n]+)/i);
            const itemMatch = text.match(/Jenis order\*?:\*?[ \t]*([^\n]+)/i);
            
            let fbDestName = nameMatch ? nameMatch[1].trim() : null;
            let fbItemName = itemMatch ? itemMatch[1].trim() : null;
            
            console.log(`\n--- Block 2 Match on msg [${index}] ---`);
            console.log("fbDestName:", fbDestName, "| fbItemName:", fbItemName);
            if (fbDestName) {
                console.log("-> BREAKING LOOP from Block 2");
                break;
            }
        }
    }
    process.exit(0);
}
test();
