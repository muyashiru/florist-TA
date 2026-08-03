const rows = [
  {
    message_text: `Baik Kak Udindun, saya sudah hitungkan semuanya ya. Berikut detail pesanannya:

*DETAIL PESANAN*
*Nama Pemesan:* Udindun
*No HP:* 08997778888
*Alamat Pengiriman:* Jl. Dipati Ukur No. 84, RT 01/RW 04, Kel. Lebakgede, Kec. Coblong, Kota Bandung, Jawa Barat 40132
*Pesanan:* Bouquet Artificial Large 093 (BAL_093)
*Waktu Pengantaran:* 8 Agustus 2026 jam 11.00 WIB
*Notes:* Happy Graduation My Love

Apakah datanya sudah benar semua, Kak?`
  }
];

let destName = "Customer Jale";
let destPhone = "no_wa";
let destAddress = "Jl. Setiabudi No.22, Hegarmanah, Cidadap, Bandung";
let itemName = "Bouquet Custom";
let deliveryTimeText = null;

for (const row of rows) {
    const text = row.message_text;
    
    // 1. Coba tangkap dari Ringkasan AI (Detail Pesanan:)
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
        
        if (destName !== "Customer Jale") break; // Stop jika berhasil ketemu
    }
}

console.log("itemName:", itemName);
console.log("destName:", destName);
