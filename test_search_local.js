import { db } from './server/db.js';

async function searchProductsInDB(userMessage, chatHistory = []) {
    try {
        const fullText = (chatHistory.map(h => h.content).join(' ') + ' ' + userMessage).toLowerCase();
        let lowerMsg = userMessage.toLowerCase();
        let skuMatch = userMessage.match(/[a-zA-Z]{2,6}[_\-\s]?[0-9]{2,4}/g);
        
        if (!skuMatch && chatHistory.length > 0) {
            const lastAssistantMsg = chatHistory.slice().reverse().find(msg => msg.role === 'assistant')?.content || '';
            skuMatch = lastAssistantMsg.match(/[a-zA-Z]{2,6}[_\-\s]?[0-9]{2,4}/g);
        }

        if (skuMatch) {
            const uniqueSkus = [...new Set(skuMatch.map(s => {
                let sku = s.replace(/[\s-]/g, '_').toUpperCase();
                return sku.replace(/([A-Z]+)(\d+)/, '$1_$2');
            }))];
            const [catRows] = await db.query('SELECT category FROM products WHERE sku IN (?) LIMIT 1', [uniqueSkus]);
            
            let queryStr = 'SELECT sku, name, category, size, price, image_url FROM products WHERE (sku IN (?)';
            let queryParams = [uniqueSkus];
            
            if (catRows.length > 0) {
                const category = catRows[0].category;
                queryStr += ' OR category = ?';
                queryParams.push(category);
            }
            queryStr += ') AND available = 1';
            
            const sizes = ['large', 'medium', 'small', 'xl', 'xxl', 'human size', 'mini'];
            let requestedSize = sizes.find(s => lowerMsg.includes(s));
            if (lowerMsg.match(/(selain|bukan|kecuali)/i)) {
                requestedSize = null; 
            }
            
            if (requestedSize) {
                queryStr += ' AND (size LIKE ? OR sku IN (?))';
                queryParams.push(`%${requestedSize}%`, uniqueSkus);
            }
            
            queryStr += ' ORDER BY (sku IN (?)) DESC, RAND() LIMIT 12';
            queryParams.push(uniqueSkus);
            console.log(queryStr, queryParams); const [rows] = await db.query(queryStr, queryParams);
            if (rows.length > 0) return rows;
        }

        return [];
    } catch (e) {
        console.error(e);
        return [];
    }
}

async function run() {
  const res = await searchProductsInDB('Saya mau pesan BAXL 005 3 buat dikirim tanggal 10 agustus jam 10 siang, alamatnya : Jl. Buah Batu No. 122, RT 04/RW 02, Kel. Cijagra, Kec. Lengkong, Kota Bandung, Jawa Barat 40265, nama penerim : Rozak, notes : Selamat Ulang Tahun', []);
  console.log(res);
  process.exit();
}
run();
