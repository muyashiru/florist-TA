const text = `Baik Kak, berikut detail pesanannya ya:
Detail Pesanan:
*Penerima:* Rozak
*No HP:* 08123123123
*Alamat:* Jl. Buah Batu No. 122, RT 04/RW 02, Kel. Cijagra, Kec. Lengkong, Kota Bandung, Jawa Barat 40265
*Produk:* 3 pcs Bouquet Artificial XL 005 (BAXL_005)
*Waktu:* Selasa, 10 Agustus 2026, jam 10.00 WIB
*Notes:* Selamat Ulang Tahun`;

const nameMatch = text.match(/\*?(?:Penerima|Pemesan|Nama|Atas Nama|Nama Penerima|Nama Pemesan)\*?:\*?[ \t]*([^\n]+)/i);
const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan)\*?:\*?[ \t]*([^\n]+)/i);

console.log("nameMatch:", nameMatch ? nameMatch[1] : null);
console.log("itemMatch:", itemMatch ? itemMatch[1] : null);
