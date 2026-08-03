import { db } from './server/db.js';

async function searchProductsInDB(userMessage) {
    const stopWords = ['bunga', 'apa', 'aja', 'saja', 'jenis', 'macam', 'halo', 'admin', 'jale', 'florist', 'saya', 'ingin', 'mau', 'memesan', 'pesan', 'produk', 'berikut', 'kode', 'harga', 'dasar', 'total', 'mohon', 'info', 'ketersediaan', 'stok', 'dan', 'biaya', 'ongkir', 'ongkirnya', 'terima', 'kasih', 'link', 'https', 'http', 'com', 'api', 'preview', 'yang', 'buat', 'untuk', 'dari', 'di', 'ke', 'aku', 'min', 'kak', 'dong', 'ada', 'cari', 'pesen', 'beli', 'dikirim', 'tanggal', 'jam', 'siang', 'sore', 'malam', 'pagi', 'alamatnya', 'jl', 'rt', 'rw', 'kel', 'kec', 'kota', 'jawa', 'barat', 'nama', 'penerim', 'penerima', 'nomor', 'notesnya', 'tolong', 'buatkan', 'ulang', 'tahun', 'pacar', 'istri', 'suami', 'nikah', 'wisuda', 'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];
    
    const cleanWords = userMessage
        .toLowerCase()
        .replace(/buket/g, 'bouquet')
        .replace(/gradu\b/g, 'graduation')
        .replace(/artif\b/g, 'artificial')
        .replace(/[^a-z0-9\s_]/g, ' ') 
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.includes(w));
    
    console.log("cleanWords:", cleanWords);

    if (cleanWords.length > 0) {
        const terms = cleanWords.slice(0, 6); 
        let scoreSelects = [];
        let queryParams = [];
        for (const term of terms) {
            scoreSelects.push(`(IF(name LIKE ?, 1, 0) + IF(category LIKE ?, 1, 0) + IF(sku LIKE ?, 2, 0) + IF(size LIKE ?, 1, 0))`);
            queryParams.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
        }
        
        const scoreExpression = scoreSelects.join(' + ');
        const queryStr = `
            SELECT sku, name, category, size, price,
            (${scoreExpression}) AS relevance_score
            FROM products
            WHERE available = 1
            HAVING relevance_score >= 2
            ORDER BY relevance_score DESC, RAND()
            LIMIT 5
        `;
        
        console.log("queryStr:", queryStr);
        const [rows] = await db.query(queryStr, queryParams);
        console.log("Found:", rows);
    }
    process.exit(0);
}

searchProductsInDB("Saya mau pesan artificial large 080 buat dikirim tanggal 8 agustus jam 15 siang, alamatnya :Jl. Dipati Ukur No. 84, RT 01/RW 04, Kel. Lebakgede, Kec. Coblong, Kota Bandung, Jawa Barat 40132, nama penerim : Arapp, notesnya tolong buatkan, buat ulang tahun pacar saya namanya Nisa nomor penerima 08997778889");
