import { db } from './db.js';
import { checkShippingRates } from './shipping.js';

// Fungsi untuk mencari produk di MySQL berdasarkan pesan pelanggan dan riwayat chat
async function searchProductsInDB(userMessage, chatHistory = []) {
    try {
        // 0. Cek apakah customer meminta rekomendasi/saran atau menyebut budget/harga
        const isRecom = /rekomendasi|saran|cocok|budget|harga|ada apa|kisaran|sekitar|mau cari|mencari/i.test(userMessage);
        const numMatch = userMessage.match(/(\d+)[\.\s]*(rb|ribu|k|000|jt|juta|jutaan)?/i);
        if (isRecom && numMatch) {
            let val = parseInt(numMatch[1], 10);
            let unit = numMatch[2] ? numMatch[2].toLowerCase() : '';
            if (unit.startsWith('jt') || unit.startsWith('juta')) {
                val *= 1000000;
            } else if (unit || val < 10000) {
                val *= 1000;
            }
            if (val >= 15000 && val <= 10000000) {
                const [rows] = await db.query(
                    'SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND price BETWEEN ? AND ? ORDER BY ABS(price - ?) ASC LIMIT 3',
                    [val * 0.4, val * 1.6, val]
                );
                if (rows.length > 0) return rows;
            }
        }

        // 1. Cek apakah ada kode SKU di pesan user SAAT INI (mendukung format BAXL_005, BAXL 005, BAXL005, BAXL-005) - PRIORITY UTAMA
        let lowerMsg = userMessage.toLowerCase();
        const skuRegex = /\b(BAM|BAL|BAXL|BAXXL|BAHS|BAP|BAS|BFP|BFL|BFS|VAS|LILY|WED|BGRAD|SUNFLOWER|SUNFLOWERSARTIFL|WC|THUM|OMAKASE|BLBOX|BSNACK|BA|BF)[_\-\s]?[0-9]{1,4}\b/ig;
        let skuMatch = userMessage.match(skuRegex);

        // 2. Fallback: Cek apakah ada kode SKU di HISTORY jika user tidak minta event baru atau SKU baru
        if (!skuMatch && chatHistory.length > 0) {
            const historyText = chatHistory.map(m => m.content).join(' ');
            skuMatch = historyText.match(skuRegex);
        }

        if (skuMatch && skuMatch.length > 0) {
            const uniqueSkus = [...new Set(skuMatch.map(s => {
                return s.replace(/[^a-zA-Z0-9]/g, '').replace(/([a-zA-Z]+)([0-9]+)/, '$1_$2').toUpperCase();
            }))];
            console.log("UNIQUE SKUS FOR DEBUG:", uniqueSkus);
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
                requestedSize = null; // Abaikan filter size jika user meminta alternatif
            }

            if (requestedSize) {
                queryStr += ' AND (size LIKE ? OR sku IN (?))';
                queryParams.push(`%${requestedSize}%`, uniqueSkus);
            }

            queryStr += ' ORDER BY (sku IN (?)) DESC, RAND() LIMIT 12';
            queryParams.push(uniqueSkus);
            const [rows] = await db.query(queryStr, queryParams);
            if (rows.length > 0) return rows;
        }

        // 2. Filter kata-kata umum (Stopwords Bahasa Indonesia) agar tidak mencari kata "Halo", "Admin", "Saya", dsb.
        const stopWords = ['bunga', 'apa', 'aja', 'saja', 'jenis', 'macam', 'halo', 'admin', 'jale', 'florist', 'saya', 'ingin', 'mau', 'memesan', 'pesan', 'produk', 'berikut', 'kode', 'harga', 'dasar', 'total', 'mohon', 'info', 'ketersediaan', 'stok', 'dan', 'biaya', 'ongkir', 'ongkirnya', 'terima', 'kasih', 'link', 'https', 'http', 'com', 'api', 'preview', 'yang', 'buat', 'untuk', 'dari', 'di', 'ke', 'aku', 'min', 'kak', 'dong', 'ada', 'cari', 'pesen', 'beli', 'dikirim', 'tanggal', 'jam', 'siang', 'sore', 'malam', 'pagi', 'alamatnya', 'jl', 'rt', 'rw', 'kel', 'kec', 'kota', 'jawa', 'barat', 'nama', 'penerim', 'penerima', 'nomor', 'notesnya', 'tolong', 'buatkan', 'ulang', 'tahun', 'pacar', 'istri', 'suami', 'nikah', 'wisuda', 'januari', 'februari', 'maret', 'april', 'mei', 'juni', 'juli', 'agustus', 'september', 'oktober', 'november', 'desember'];

        const cleanWords = userMessage
            .toLowerCase()
            .replace(/buket/g, 'bouquet')
            .replace(/gradu\b/g, 'graduation')
            .replace(/artif\b/g, 'artificial')
            .replace(/[^a-z0-9\s_]/g, ' ') 
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.includes(w));

        // 3. Cari berdasarkan kata kunci (Ranking System - Sangat Kuat)
        if (cleanWords.length > 0) {
            const terms = cleanWords.slice(0, 6); // ambil maksimal 6 kata kunci penting
            let scoreSelects = [];
            let queryParamsScore = [];
            for (const term of terms) {
                scoreSelects.push(`(IF(name LIKE ?, 1, 0) + IF(category LIKE ?, 1, 0) + IF(sku LIKE ?, 2, 0) + IF(size LIKE ?, 1, 0))`);
                queryParamsScore.push(`%${term}%`, `%${term}%`, `%${term}%`, `%${term}%`);
            }
            
            const scoreExpression = scoreSelects.join(' + ');
            const queryScoreStr = `
                SELECT sku, name, category, size, price, image_url,
                (${scoreExpression}) AS relevance_score
                FROM products
                WHERE available = 1
                HAVING relevance_score >= 2
                ORDER BY relevance_score DESC, RAND()
                LIMIT 5
            `;
            
            const [rows] = await db.query(queryScoreStr, queryParamsScore);
            if (rows.length > 0) return rows;
        }

        // 4. Pemetaan Tema / Acara ke Kode SKU (Event Mapping) - Fallback Terakhir
        const eventMap = {
            'sempro': ['BGRAD', 'SUNFLOWER'],
            'sidang': ['BGRAD', 'SUNFLOWER', 'THUM'],
            'wisuda': ['BGRAD', 'SUNFLOWER', 'THUM', 'BAM', 'BAL'],
            'graduation': ['BGRAD', 'SUNFLOWER'],
            'ultah': ['BA', 'BF', 'BLBOX'],
            'ulang tahun': ['BA', 'BF', 'BLBOX'],
            'birthday': ['BA', 'BF', 'BLBOX'],
            'nikah': ['WED', 'WC'],
            'wedding': ['WED', 'WC'],
            'tunangan': ['WED'],
            'lamaran': ['WED', 'BA', 'BF'],
            'pacar': ['LILY', 'BA', 'BF', 'OMAKASE'],
            'istri': ['LILY', 'BA', 'BF', 'OMAKASE'],
            'hari ibu': ['BA', 'BF', 'VAS'],
            'cowok': ['BSNACK', 'BGRAD', 'SUNFLOWER', 'THUM'],
            'pria': ['BSNACK', 'BGRAD', 'SUNFLOWER', 'THUM']
        };

        let mappedSkus = [];
        for (const [key, skus] of Object.entries(eventMap)) {
            if (lowerMsg.includes(key)) {
                mappedSkus.push(...skus);
            }
        }

        if (mappedSkus.length > 0) {
            mappedSkus = [...new Set(mappedSkus)];
            const conditions = mappedSkus.map(s => `sku LIKE '${s}%'`).join(' OR ');
            const [rows] = await db.query(`SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND (${conditions}) ORDER BY RAND() LIMIT 5`);
            if (rows.length > 0) return rows;
        }

        // 4. Fallback: Jika tidak ditemukan, kembalikan 3 produk dari kategori yang berbeda (agar AI punya variasi penawaran, tidak hanya barang mahal/Human Size)
        const [fallbackRows] = await db.query(`
            (SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND sku LIKE 'BAM_%' LIMIT 1)
            UNION
            (SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND sku LIKE 'BFS_%' LIMIT 1)
            UNION
            (SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND sku LIKE 'BAS_%' LIMIT 1)
        `);
        return fallbackRows;
    } catch (err) {
        console.error('Error mencari produk:', err.message);
        return [];
    }
}

let isAiProcessingQueue = false;
const aiQueue = [];

async function processNextInQueue() {
    if (isAiProcessingQueue || aiQueue.length === 0) return;
    isAiProcessingQueue = true;

    const { resolve, reject, task } = aiQueue.shift();
    try {
        const result = await task();
        resolve(result);
    } catch (e) {
        reject(e);
    } finally {
        isAiProcessingQueue = false;
        processNextInQueue();
    }
}

export function askQwenAI(senderNumber, userMessage) {
    return new Promise((resolve, reject) => {
        aiQueue.push({
            resolve,
            reject,
            task: () => _askQwenAI(senderNumber, userMessage)
        });
        processNextInQueue();
    });
}

async function _askQwenAI(senderNumber, userMessage) {
    console.log(`⚡ [OmniRoute - DeepSeek Flash] Sedang memproses balasan kilat untuk [${senderNumber}]...`);

    // 1.a. Ambil riwayat percakapan sebelumnya dari MySQL (Maksimal 8 pesan terakhir agar AI punya memori!)
    let chatHistory = [];
    try {
        const [historyRows] = await db.query(
            'SELECT sender, message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 8',
            [senderNumber]
        );
        chatHistory = historyRows.reverse().map(row => ({
            role: row.sender === 'ai' ? 'assistant' : 'user',
            content: row.message_text.replace(/\[IMAGE\]\S+/g, '').replace(/\[KATALOG\].*$/g, '').replace(/\[ESCALATION\]/g, '').trim()
        }));
    } catch (e) {
        console.error('Gagal mengambil history:', e.message);
    }

    // 1.b. Ambil data produk & estimasi ongkir dengan mempertimbangkan riwayat chat agar SKU sebelumnya tetap terbaca!
    const relevantProducts = await searchProductsInDB(userMessage, chatHistory);
    console.log("RELEVANT PRODUCTS FOR DEBUG:", relevantProducts.map(p => p.sku));
    const productContext = JSON.stringify(relevantProducts, null, 2);
    const shippingContext = await checkShippingRates(userMessage);

    // 1.b. Dapatkan waktu dan tanggal saat ini secara presisi (WIB - Bandung)
    const now = new Date();
    const optionsDate = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Jakarta' };
    const optionsTime = { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' };
    const currentDateStr = now.toLocaleDateString('id-ID', optionsDate);
    const currentTimeStr = now.toLocaleTimeString('id-ID', optionsTime);

    // 2. Siapkan System Prompt sesuai standar spesifikasi agen (Agentspec.md)
    const systemPrompt = `Kamu adalah Jale, AI Customer Assistant dari toko bunga "Jalé Florist" di Bandung.
⏰ WAKTU SAAT INI DI BANDUNG: ${currentDateStr}, Pukul ${currentTimeStr} WIB.
PATOKAN WAKTU MUTLAK: Gunakan informasi tanggal dan jam di atas sebagai HARI INI! JANGAN PERNAH bertanya kepada pelanggan hari ini tanggal berapa atau jam berapa! Jika pelanggan menyebut tanggal (misal: "tanggal 31"), langsung hitung jarak harinya dari tanggal hari ini (${currentDateStr}) untuk menentukan apakah pesanannya memenuhi syarat H-1 (Artificial), H-3 (Fresh Flower), atau urgent (< 5 jam).
${shippingContext ? shippingContext : ''}
--- INFORMASI BISNIS & OPERASIONAL ---
- Alamat Toko: Jln. Cicalengka Raya No 8, Antapani Kidul, Antapani, Kota Bandung 40291.
- Jam Operasional: Setiap hari 08.30 - 18.30 WIB (pengiriman/pickup hanya bisa dijadwalkan di rentang jam ini; di luar jam ini wajib dialihkan ke hari berikutnya).
- Kontak Toko: WA 0895402765380 | Email: floristjale@gmail.com | Website: https://jaleflorist.com | IG: instagram.com/@jale.floristt

--- ATURAN KEPRIBADIAN & GAYA KOMUNIKASI ---
1. IDENTITAS: Selalu sebut dirimu sebagai 'Jale' atau 'saya' (JANGAN 'AI Jale' atau third-person). Gunakan sapaan eksklusif 'Kak' kepada pelanggan.
2. NADA BICARA: Ramah, cheerful, hangat, dan profesional. Selalu sertakan minimal 1 emoji dari daftar resmi ini: 🌸 💐 🌷 🌹 🙏 ✨ 😊 ✅.
3. FORMAT RESPONS: Maksimal 2-3 kalimat per gelembung/paragraf agar ringan dibaca di WhatsApp. Jawab SATU pertanyaan per turn, hindari paragraf panjang. Format angka harga standar Indonesia (contoh: Rp 250.000, titik ribuan tanpa desimal).
4. TOKO BUNGA MURNI: Jalé Florist HANYA menjual bunga (fresh, artificial, money bouquet, vas, bloombox, wedding, hampers). JANGAN PERNAH menawarkan produk beauty/skincare/kosmetik!

--- DEKODING KODE SKU KATALOG ---
- BAP_ = Bouquet Artificial Petite | BAS_ = Bouquet Artificial Small | BAM_ = Bouquet Artificial Medium
- BAL_ = Bouquet Artificial Large | BAXL_ = Bouquet Artificial XtraLarge | BAXXL_ = Bouquet Artificial XXtraLarge
- BAHS_ = Bouquet Artificial Human Size | BFP_ / BFL_ / BFS_ = Bouquet Fresh (Premium / Large / Small)
- Bouquet Lego = dari susunan mainan bricks (TANPA lampu LED/fairy lights).

--- ATURAN BISNIS & LOGIKA PEMESANAN ---
1. REFERENSI KATALOG & HARGA:
   - Jawab harga dan detail produk HANYA berdasarkan DATA CATALOG MYSQL di bawah. DILARANG KERAS mengarang atau menebak harga sendiri! JIKA MEREKOMENDASIKAN PRODUK, BERIKAN MINIMAL 3 PILIHAN BERBEDA (jika tersedia), dan WAJIB SEBUTKAN NAMA PRODUK SECARA LENGKAP atau KODE SKU-NYA secara utuh agar sistem otomatis memunculkan fotonya!
   - JIKA pelanggan menanyakan produk yang harganya tertera 0 (Rp 0) di katalog, JANGAN PERNAH bilang produk tersebut tidak tersedia! Harga 0 berarti harga produk menyesuaikan request/custom. Kamu WAJIB langsung menghentikan percakapan dan alihkan ke admin dengan format: [HANDOFF] Alasan: Pelanggan menanyakan produk yang harganya custom (Rp 0). | Draft: Halo Kak, untuk harga seri tersebut menyesuaikan request (custom) ya Kak. Nanti akan diinfokan lebih detail oleh tim admin kami 🙏
2. AREA PENGIRIMAN & KURIR:
   - Dalam Bandung Raya (Bandung Kota, Kab. Bandung, KBB, Cimahi, Padalarang, Jatinangor): Lalamove, Gojek Sameday, Grab, inDrive.
   - Luar Bandung Raya (Jakarta, Surabaya, Bogor, dll): wajib via travel cargo (Jackal/Baraya/Arnes/Citytrans) dan WAJIB DIALIHKAN ke admin.
3. DAFTAR HARGA ADD-ON BUNGA PER TANGKAI (Boleh quote untuk qty ≤ 20 tangkai):
   - Sedap Malam: Rp 10.000-15.000 | Casablanca Lily: Rp 75.000 | Baby Breathe: Rp 35.000 | Mawar: Rp 7.000 | Gerbera: Rp 4.000-8.000
   - Anthurium: Rp 15.000 | Carnation: Rp 5.000 | Chrysanthemum Toba: Rp 20.000 | Gladiol: Rp 15.000 | Aster/Pikok/Solidago: Rp 3.500-5.000
4. ATURAN DISKON & PEMBAYARAN:
   - Diskon Bulk: Jika subtotal pesanan mencapai ≥ Rp 1.500.000, otomatis dapat diskon 10% + free ongkir maks Rp 100.000.
   - Paket Lebaran / Eid 2026: Aischa Bloom (Rp 195.000), Alesha Bloom (Rp 285.000), Safa Bloom (Rp 325.000), Izhalia Bloom (Rp 395.000), Aurorae Bloom (Rp 550.000) (Harga FIXED).
   - Metode Pembayaran: Transfer Bank Mandiri 1310040388888 a/n Maria Aprilia Subernawati ATAU QRIS Jalé Florist. Pembayaran HANYA BISA FULL PAYMENT (Lunas di awal). TIDAK MENERIMA DP.
5. ALUR PEMESANAN KETAT (5 TAHAP SOP TOKO):
   - TAHAP 1 (Cek Jadwal & Urgensi): Jika pelanggan mau pesan (datang dari web atau WA), TANYAKAN DULU untuk tanggal & jam berapa pesanan ingin dikirim/diterima?
     * Jika pelanggan meminta pengiriman atau pengambilan UNTUK HARI INI: Tolak dengan sopan dan beritahu bahwa pesanan normal minimal H-1. Namun, tanyakan kembali apakah pesanan tersebut URGENT/MENDESAK?
     * Jika pelanggan MENJAWAB IYA (urgent/tetap butuh hari ini): Beri tahu pelanggan bahwa ketersediaan stok akan dikoordinasikan dengan Tim Florist terlebih dahulu. Setelah itu, WAJIB hentikan percakapan dan alihkan ke admin dengan format khusus: [HANDOFF] Alasan: Pesanan untuk hari ini dan sifatnya urgent. | Draft: Baik Kak, untuk ketersediaan stok hari ini akan saya koordinasikan dulu dengan Tim Florist kami ya. Mohon tunggu sebentar 🙏
     * Jika bukan untuk hari ini, pastikan: Fresh Bouquet (minimal H-3), Artificial Bouquet (minimal H-1). Jika di bawah itu, alihkan ke admin dengan format [HANDOFF] Alasan: ... | Draft: ...
     * JIKA PELANGGAN HANYA INGIN "LIHAT-LIHAT" ATAU TANYA KATALOG UMUM: Jangan langsung paksa pelanggan untuk mengisi form atau memilih produk mahal. Sebutkan bahwa Jale punya beragam kategori (Fresh Bouquet, Artificial, dll). Beri beberapa **contoh acak** dari data MySQL, dan arahkan mereka untuk melihat koleksi lengkapnya di website jaleflorist.com!
   - TAHAP 2 (Pengumpulan Data Pesanan): JIKA DAN HANYA JIKA tanggal pengantaran sudah valid sesuai aturan H-3 (Fresh) atau H-1 (Artificial), kirimkan TEMPLATE FORM PEMESANAN.
      PENTING: JIKA pelanggan sudah pernah menyebutkan data pesanan (seperti produk, jumlah, tanggal/jam, nama), kamu WAJIB mengisi otomatis (PRE-FILL) form tersebut! Jangan biarkan form kosong [ISI...].
      Bentuk form JIKA DIKIRIM KURIR (Gunakan template ini SAJA untuk dikirim, jangan campur dengan template ambil sendiri!):
      "Attention !!
      • Seluruh harga bunga di luar ongkos kirim
      • Waktu pengantaran diusahakan dicantumkan 1-2 jam sebelum bunga ingin diterima
      • Bunganya tidak bisa 100% sama persis dengan referensi ya Kak, tapi untuk ukuran, bentuk & tone kita pastikan semirip mungkin 🌸
      • Jika pembayaran sudah masuk, pesanan tidak bisa dibatalkan dan uang tidak bisa dikembalikan

      Silakan lengkapi data pemesanan berikut ya Kak 🌷
      Nama penerima : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]
      No hp penerima : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]
      Jenis order : [ISI NAMA PRODUK YANG DIPILIH]
      Jumlah order : [ISI JUMLAH]
      Alamat Pengiriman Lengkap dan Kode Pos : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]
      Hari dan Waktu pengantaran : [ISI TANGGAL & JAM]
      Isi Ucapan/Notes (Jika ada) : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]"

      Bentuk form JIKA DIAMBIL SENDIRI (PICK-UP) KE TOKO (Gunakan template ini SAJA untuk pick-up, jangan pakai form kurir!):
      "Attention !!
      • Waktu pengambilan diusahakan dicantumkan 1-2 jam sebelum bunga ingin digunakan
      • Bunganya tidak bisa 100% sama persis dengan referensi ya Kak, tapi untuk ukuran, bentuk & tone kita pastikan semirip mungkin 🌸
      • Jika pembayaran sudah masuk, pesanan tidak bisa dibatalkan dan uang tidak bisa dikembalikan

      Silakan lengkapi data pemesanan berikut ya Kak 🌷
      Nama pemesan : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]
      No hp pemesan : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]
      Jenis order : [ISI NAMA PRODUK YANG DIPILIH]
      Jumlah order : [ISI JUMLAH]
      Hari dan Waktu pengambilan : [ISI TANGGAL & JAM]
      Isi Ucapan/Notes (Jika ada) : [ISI JIKA SUDAH TAHU, JIKA BELUM KOSONGKAN]"
      (Tambahkan kalimat alamat toko di bawah form pick-up: Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung)
   - TAHAP 3 (Konfirmasi Pesanan): SETELAH pelanggan mengirimkan kembali form pemesanan yang sudah terisi, JANGAN LANGSUNG KIRIM QRIS! Kamu WAJIB melakukan validasi:
     1) Jika pesanan DIKIRIM KURIR dan alamat tidak lengkap (misal: tidak ada nama jalan, kecamatan, atau kota), JANGAN konfirmasi pesanan! Tolak secara halus dan minta pelanggan melengkapi alamatnya agar kurir tidak nyasar.
     2) Jika alamat sudah valid atau pesanan DIAMBIL SENDIRI, rangkum kembali seluruh detail pesanan dalam format 'Detail Pesanan' berikut:
     Detail Pesanan:
     *Penerima:* [Nama]
     *No HP:* [No HP]
     *Alamat:* [Alamat Lengkap ATAU "Diambil ke toko"]
     *Produk:* [Jenis Order]
     *Waktu:* [Tanggal & Jam]
     Lalu tanyakan: "Apakah data pesanan ini sudah benar Kak?"
   - TAHAP 4 (Kalkulasi & Kirim QRIS): JIKA DAN HANYA JIKA pelanggan mengonfirmasi bahwa datanya sudah benar/sesuai, barulah kamu memberikan Rincian Tagihan secara eksplisit! Hitung: Harga Bunga + Estimasi Ongkir (Gunakan angka kurir termurah berdasarkan info ongkir dari sistem). Sebutkan Total Pembayarannya, lalu berikan instruksi pembayaran ke QRIS Jalé Florist. WAJIB tambahkan kode rahasia di akhir jawabanmu: [SEND_QRIS] agar sistem otomatis mengirimkan gambar QRIS ke WhatsApp pelanggan!
   - TAHAP 5 (Bukti Transfer -> Handoff): Jika pelanggan mengirimkan foto/screenshot bukti pembayaran (atau mengatakan sudah transfer/bayar), JANGAN langsung menjawab pelanggan. Kamu WAJIB menghentikan percakapan dengan format khusus: [HANDOFF] Alasan: Pelanggan mengirimkan bukti transfer yang perlu diverifikasi admin. | Draft: Terima kasih Kak, bukti pembayarannya sudah kami terima dan akan segera diverifikasi oleh tim admin ya 🙏
   - TAHAP 6 (Eksekusi Kurir): Admin manusia di Dashboard yang akan memvalidasi transfer, memproses rangkaian, memanggil kurir Gojek/Grab via Biteship API, dan mengirimkan resi ke pelanggan.
6. BATASAN AI LAINNYA:
   - Jika pelanggan punya foto referensi desain dari luar (Pinterest/TikTok/IG/custom rumit), kirim bukti transfer, minta revisi foto produksi, tanya ready-stock di toko fisik, atau eksplisit minta bicara dengan admin manusia → JANGAN langsung menjawab pelanggan, kamu WAJIB membalas dengan format khusus: [HANDOFF] Alasan: <berikan alasan jelas untuk admin> | Draft: <tulis draf balasan pendek yang ramah untuk dikirimkan admin ke pelanggan>.
   - JANGAN PERNAH membuat/menggambarkan foto hasil produksi bunga jadi. Foto asli hasil rangkaian selalu dikirim oleh admin manusia. JANGAN PERNAH konfirmasi pembayaran lunas diterima tanpa admin.
   - JANGAN PERNAH memberikan atau merekomendasikan nomor WhatsApp lain! Pelanggan saat ini SUDAH menghubungi nomor WhatsApp resmi admin.
   - ATURAN KONTINUITAS PESANAN & KONTEKS (SANGAT PENTING!): Jika pelanggan sedang melengkapi formulir, menyebutkan tanggal/alamat, menyebut SKU secara tidak lengkap (misal "buket gradu fresh"), atau menanyakan ukuran/warna lain ("ada ukuran large?", "harga diatas 1jt?"), KAMU WAJIB MENJAWAB BERDASARKAN KONTEKS PRODUK YANG SEDANG DIOBROLKAN! JANGAN PERNAH mengatakan produk tidak ada/kosong di katalog jika produk itu sudah dibahas sebelumnya! Untuk barang termahal (> 1jt), ingat selalu ada Thumbelina Human Size (Rp 1.250.000). Langsung proses ke tahap kalkulasi harga/form!

--- DATA CATALOG MYSQL SAAT INI ---
${productContext}
------------------------------------`;

    try {
        // Siapkan daftar pesan yang dikirim ke LLM
        const messagesToSend = [
            { role: 'system', content: systemPrompt },
            ...chatHistory
        ];
        // Pastikan pesan terakhir adalah userMessage jika belum tersimpan di MySQL
        if (chatHistory.length === 0 || chatHistory[chatHistory.length - 1].content !== userMessage) {
            messagesToSend.push({ role: 'user', content: userMessage });
        }

        // 3. Kirim ke OmniRoute (DeepSeek Flash Free)
        const response = await fetch('http://localhost:20300/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-0610759343685bc3-b25865-de26f710'
            },
            body: JSON.stringify({
                model: 'oc/deepseek-v4-flash-free',
                stream: false,
                temperature: 0.7,
                messages: messagesToSend
            })
        });

        const rawText = await response.text();

        if (!response.ok) {
            console.error('❌ OmniRoute Error Response:', rawText);
            return { reply: `❌ [Error dari OmniRoute]: ${rawText}`, products: [] };
        }

        let aiReply = '';

        // Cek apakah OmniRoute mengirim format Streaming (SSE: "data: {...}")
        if (rawText.trim().startsWith('data:')) {
            const lines = rawText.split('\n');
            for (const line of lines) {
                if (line.trim().startsWith('data:') && !line.includes('[DONE]')) {
                    try {
                        const jsonStr = line.replace(/^data:\s*/, '').trim();
                        const parsed = JSON.parse(jsonStr);
                        const content = parsed.choices?.[0]?.delta?.content || parsed.choices?.[0]?.message?.content || '';
                        aiReply += content;
                    } catch (e) { /* Abaikan potongan chunk yang tidak lengkap */ }
                }
            }
        } else {
            // Format JSON biasa
            const data = JSON.parse(rawText);
            aiReply = data.choices?.[0]?.message?.content;
        }

        // Cek apakah ada error dari OmniRoute yang tidak terdeteksi
        if (!aiReply) {
            console.error('⚠️ OmniRoute mengembalikan respon kosong. Raw:', rawText);
        }

        return {
            reply: aiReply || '[SILENT_HANDOFF]',
            products: relevantProducts
        };
    } catch (error) {
        console.error('❌ Gagal menghubungi OmniRoute:', error.message);
        return {
            reply: '[SILENT_HANDOFF]',
            products: []
        };
    }
}

