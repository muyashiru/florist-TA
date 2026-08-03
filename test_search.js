import { searchProductsInDB } from './server/ai.js';
async function run() {
  const res = await searchProductsInDB('Saya mau pesan BAXL 005 3 buat dikirim tanggal 10 agustus jam 10 siang, alamatnya : Jl. Buah Batu No. 122, RT 04/RW 02, Kel. Cijagra, Kec. Lengkong, Kota Bandung, Jawa Barat 40265, nama penerim : Rozak, notes : Selamat Ulang Tahun', []);
  console.log(res);
  process.exit();
}
run();
