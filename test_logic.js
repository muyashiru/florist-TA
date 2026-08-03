import { db } from './server/db.js';
async function test() {
    const no_wa = '0895339549364_SANDBOX';
    let destName = "Customer Jale";
    let destPhone = no_wa;
    let destAddress = "Jl. Setiabudi No.22, Hegarmanah, Cidadap, Bandung";
    let itemName = "Bouquet Custom";
    let deliveryTimeText = null;

    const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
    for (const row of rows) {
        const text = row.message_text;
        
        if (text.includes('Detail Pesanan') || text.includes('Detail pesanan') || text.includes('DETAIL PESANAN') || text.includes('Silakan lengkapi data pemesanan')) {
            const nameMatch = text.match(/\*?(?:Penerima|Pemesan|Nama|Atas Nama|Nama Penerima|Nama Pemesan)\*?:\*?[ \t]*([^\n]+)/i);
            const phoneMatch = text.match(/\*?(?:No HP|No\. HP|Nomor HP)\*?:\*?[ \t]*([^\n]+)/i);
            const addrMatch = text.match(/\*?(?:Alamat|Lokasi|Alamat Pengiriman)\*?:\*?[ \t]*([^\n]+)/i);
            const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan)\*?:\*?[ \t]*([^\n]+)/i);
            const timeMatch = text.match(/\*?(?:Waktu|Tanggal|Hari dan Waktu|Waktu Pengambilan|Waktu Pengantaran)\*?:\*?[ \t]*([^\n]+)/i);
            
            if (nameMatch && nameMatch[1]) destName = nameMatch[1].replace(/\([0-9\s\+]+\)/g, '').replace(/\*/g, '').trim();
            if (phoneMatch && phoneMatch[1]) destPhone = phoneMatch[1].replace(/\*/g, '').trim();
            if (addrMatch && addrMatch[1]) destAddress = addrMatch[1].replace(/\*/g, '').trim();
            if (itemMatch && itemMatch[1]) itemName = itemMatch[1].replace(/\*/g, '').trim();
            if (timeMatch && timeMatch[1]) deliveryTimeText = timeMatch[1].replace(/\*/g, '').trim();
            
            if (destName !== "Customer Jale") break; 
        }
        
        if (text.includes('Nama penerima') || text.includes('Nama pemesan') || text.includes('Nama')) {
            const nameMatch = text.match(/Nama(?: penerima| pemesan|)\*?:\*?[ \t]*([^\n]+)/i);
            const phoneMatch = text.match(/No(?: hp| HP)(?: penerima| pemesan|)\*?:\*?[ \t]*([^\n]+)/i);
            const addrMatch = text.match(/Alamat(?: Pengiriman|).*?\*?:\*?[ \t]*([^\n]+)/i);
            const itemMatch = text.match(/Jenis order\*?:\*?[ \t]*([^\n]+)/i);
            const timeMatch = text.match(/(?:Hari dan |)Waktu (?:pengantaran|pengambilan)(?:.*?)\*?:\*?[ \t]*([^\n]+)/i);
            
            if (nameMatch && nameMatch[1]) destName = nameMatch[1].trim();
            if (phoneMatch && phoneMatch[1]) destPhone = phoneMatch[1].trim();
            if (addrMatch && addrMatch[1]) destAddress = addrMatch[1].trim();
            if (itemMatch && itemMatch[1]) itemName = itemMatch[1].trim();
            if (timeMatch && timeMatch[1]) deliveryTimeText = timeMatch[1].trim();
            break;
        }
    }
    console.log("itemName is:", `[${itemName}]`);
    process.exit(0);
}
test();
