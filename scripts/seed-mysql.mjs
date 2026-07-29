import mysql from 'mysql2/promise';
import { products } from '../src/data/products.js';

async function seedDatabase() {
    console.log('⏳ Menghubungkan ke MySQL...');

    // Sesuaikan password MySQL lokal Anda
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '', // Isi jika MySQL Anda pakai password
        database: 'jale_florist_ta'
    });

    console.log('✅ Terhubung! Mulai memasukkan ' + products.length + ' produk...');

    const sql = `
    INSERT INTO products (sku, name, category, size, price, image_url, is_popular, available)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE 
      name=VALUES(name), price=VALUES(price), image_url=VALUES(image_url), available=VALUES(available);
  `;

    let count = 0;
    for (const p of products) {
        await connection.execute(sql, [
            p.id,
            p.name,
            p.category,
            p.size,
            p.price,
            p.image,
            p.isPopular || false,
            p.available || true
        ]);
        count++;
        if (count % 100 === 0) console.log(`👉 Berhasil memasukkan ${count} produk...`);
    }

    console.log(`🎉 SELESAI! Total ${count} produk berhasil masuk ke database MySQL!`);
    await connection.end();
}

seedDatabase().catch(err => {
    console.error('❌ Terjadi kesalahan:', err);
});
