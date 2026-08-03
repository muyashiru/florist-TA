const text = `Baik Kak, sebentar saya rangkum dulu ya pesanannya 😊

*Detail Pesanan:*
*Penerima:* Udindun
*No HP:* 08997778888
*Alamat:* Jl. Dipati Ukur No. 84, RT 01/RW 04, Kel. Lebakgede, Kec. Coblong, Kota Bandung, Jawa Barat 40132
*Produk:* Bouquet Artificial Large 093 (BAL_093) - 1 pcs
*Waktu:* Sabtu, 8 Agustus 2026 jam 11.00 WIB
*Notes:* Happy birthday, Nida! 💐

Apakah data pesanan ini sudah benar Kak? 🙏✨`;

const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan)\*?:\*?[ \t]*([^\n]+)/i);
console.log(itemMatch);
console.log("value:", itemMatch ? itemMatch[1] : null);
