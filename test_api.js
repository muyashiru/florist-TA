async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/test-ai', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        message: 'Saya mau pesan BAXL 005 3 buat dikirim tanggal 10 agustus jam 10 siang, alamatnya : Jl. Buah Batu No. 122, RT 04/RW 02, Kel. Cijagra, Kec. Lengkong, Kota Bandung, Jawa Barat 40265, nama penerim : Rozak, notes : Selamat Ulang Tahun',
        sender: '62895339549364_SANDBOX'
      })
    });
    const text = await res.text();
    console.log(text);
  } catch (err) {
    console.error(err);
  }
}
run();
