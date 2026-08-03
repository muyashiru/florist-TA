const text = `*DETAIL PESANAN*
*Nama Pemesan:* Udindun
*No HP:* 08997778888
*Alamat Pengiriman:* Jl. Dipati Ukur No. 84, RT 01/RW 04, Kel. Lebakgede, Kec. Coblong, Kota Bandung, Jawa Barat 40132
*Pesanan:* Bouquet Artificial Large 093 (BAL_093)
*Waktu Pengantaran:* 8 Agustus 2026 jam 11.00 WIB
*Notes:* Happy Graduation My Love`;

const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan):\*?\s*([^\n]+)/i);
console.log(itemMatch ? itemMatch[1] : null);
