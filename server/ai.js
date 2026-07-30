import { db } from './db.js';
import { checkShippingRates } from './shipping.js';

// Fungsi untuk mencari produk di MySQL berdasarkan pesan pelanggan dan riwayat chat
async function searchProductsInDB(userMessage, chatHistory = []) {
    try {
        // 0. Cek apakah customer meminta rekomendasi/saran atau menyebut budget/harga
        const isRecom = /rekomendasi|saran|cocok|budget|harga|ada apa|kisaran|sekitar|mau cari|mencari/i.test(userMessage);
        const numMatch = userMessage.match(/(\d+)[\.\s]*(rb|ribu|k|000)?/i);
        if (isRecom && numMatch) {
            let val = parseInt(numMatch[1], 10);
            if (numMatch[2] || val < 10000) val *= 1000;
            if (val >= 15000 && val <= 10000000) {
                const [rows] = await db.query(
                    'SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 AND price BETWEEN ? AND ? ORDER BY ABS(price - ?) ASC LIMIT 3',
                    [val * 0.4, val * 1.6, val]
                );
                if (rows.length > 0) return rows;
            }
        }

        // 1. Cek apakah ada kode SKU (misal: BAHS_002, BAL_001, BAXL_005) di dalam pesan ATAU riwayat chat sebelumnya!
        const historyText = chatHistory.map(m => m.content).join(' ');
        const combinedText = `${userMessage} ${historyText}`;
        const skuMatch = combinedText.match(/[a-zA-Z]+_[0-9]+/g);
        if (skuMatch && skuMatch.length > 0) {
            const uniqueSkus = [...new Set(skuMatch.map(s => s.toUpperCase()))];
            const [rows] = await db.query(
                'SELECT sku, name, category, size, price, image_url FROM products WHERE sku IN (?) OR sku LIKE ? LIMIT 6',
                [uniqueSkus, `%${uniqueSkus[0]}%`]
            );
            if (rows.length > 0) return rows;
        }

        // 2. Filter kata-kata umum (Stopwords Bahasa Indonesia) agar tidak mencari kata "Halo", "Admin", "Saya", dsb.
        const stopWords = ['halo', 'admin', 'jale', 'florist', 'saya', 'ingin', 'mau', 'memesan', 'pesan', 'produk', 'berikut', 'kode', 'harga', 'dasar', 'total', 'mohon', 'info', 'ketersediaan', 'stok', 'dan', 'biaya', 'ongkir', 'ongkirnya', 'terima', 'kasih', 'link', 'https', 'http', 'com', 'api', 'preview', 'yang', 'buat', 'untuk', 'dari', 'di', 'ke', 'aku', 'min', 'kak', 'dong', 'ada', 'cari', 'pesen', 'beli'];
        
        const cleanWords = userMessage
            .toLowerCase()
            .replace(/[^a-z0-9\s_]/g, ' ') // hapus tanda baca kecuali underscore
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.includes(w));

        // 3. Cari berdasarkan kata kunci penting yang tersisa (misal: "gift", "custom", "006")
        if (cleanWords.length > 0) {
            // Ambil maksimal 4 kata kunci teratas
            const terms = cleanWords.slice(0, 4).map(w => `%${w}%`);
            
            // Buat query dinamis dengan AND agar lebih presisi (contoh: cari 'gift' AND '006')
            let queryStr = 'SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1';
            let queryParams = [];
            
            for (const term of terms) {
                queryStr += ' AND (name LIKE ? OR category LIKE ? OR sku LIKE ?)';
                queryParams.push(term, term, term);
            }
            queryStr += ' LIMIT 5';

            const [rows] = await db.query(queryStr, queryParams);
            if (rows.length > 0) return rows;
            
            // Jika AND tidak ketemu, coba fallback dengan OR untuk term pertama saja
            const [fallbackOR] = await db.query(
                'SELECT sku, name, category, size, price, image_url FROM products WHERE (name LIKE ? OR category LIKE ? OR sku LIKE ?) AND available = 1 LIMIT 3',
                [terms[0], terms[0], terms[0]]
            );
            if (fallbackOR.length > 0) return fallbackOR;
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
- Kontak Toko: WA 081367931303 | Email: floristjale@gmail.com | Website: jaleflorist.com | IG: @jale.floristt

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
   - Jawab harga dan detail produk HANYA berdasarkan DATA CATALOG MYSQL di bawah. DILARANG KERAS mengarang atau menebak harga sendiri!
2. AREA PENGIRIMAN & KURIR:
   - Dalam Bandung Raya (Bandung Kota, Kab. Bandung, KBB, Cimahi, Padalarang, Jatinangor): Lalamove, Gojek Sameday, Grab, inDrive.
   - Luar Bandung Raya (Jakarta, Surabaya, Bogor, dll): wajib via travel cargo (Jackal/Baraya/Arnes/Citytrans) dan WAJIB DIALIHKAN ke admin.
3. DAFTAR HARGA ADD-ON BUNGA PER TANGKAI (Boleh quote untuk qty ≤ 20 tangkai):
   - Sedap Malam: Rp 10.000-15.000 | Casablanca Lily: Rp 75.000 | Baby Breathe: Rp 35.000 | Mawar: Rp 7.000 | Gerbera: Rp 4.000-8.000
   - Anthurium: Rp 15.000 | Carnation: Rp 5.000 | Chrysanthemum Toba: Rp 20.000 | Gladiol: Rp 15.000 | Aster/Pikok/Solidago: Rp 3.500-5.000
4. ATURAN DISKON & PEMBAYARAN:
   - Diskon Bulk: Jika subtotal pesanan mencapai ≥ Rp 1.500.000, otomatis dapat diskon 10% + free ongkir maks Rp 100.000.
   - Paket Lebaran / Eid 2026: Aischa Bloom (Rp 195.000), Alesha Bloom (Rp 285.000), Safa Bloom (Rp 325.000), Izhalia Bloom (Rp 395.000), Aurorae Bloom (Rp 550.000) (Harga FIXED).
   - Metode Pembayaran: Transfer Bank Mandiri 1310040388888 a/n Maria Aprilia Subernawati ATAU QRIS Jalé Florist. DP minimal 50%.
5. ALUR PEMESANAN KETAT (5 TAHAP SOP TOKO):
   - TAHAP 1 (Cek Jadwal & Urgensi): Jika pelanggan mau pesan (datang dari web atau WA), TANYAKAN DULU untuk tanggal & jam berapa pesanan ingin dikirim/diterima?
     * Jika pelanggan meminta pengiriman atau pengambilan UNTUK HARI INI: Tolak dengan sopan dan beritahu bahwa pesanan normal minimal H-1. Namun, tanyakan kembali apakah pesanan tersebut URGENT/MENDESAK?
     * Jika pelanggan MENJAWAB IYA (urgent/tetap butuh hari ini): Beri tahu pelanggan bahwa ketersediaan stok akan dikoordinasikan dengan Tim Florist terlebih dahulu. Setelah itu, WAJIB hentikan percakapan dan alihkan ke admin dengan format khusus: [HANDOFF] Alasan: Pesanan untuk hari ini dan sifatnya urgent. | Draft: Baik Kak, untuk ketersediaan stok hari ini akan saya koordinasikan dulu dengan Tim Florist kami ya. Mohon tunggu sebentar 🙏
     * Jika bukan untuk hari ini, pastikan: Fresh Bouquet (minimal H-3), Artificial Bouquet (minimal H-1). Jika di bawah itu, alihkan ke admin dengan format [HANDOFF] Alasan: ... | Draft: ...
     * JIKA PELANGGAN HANYA INGIN "LIHAT-LIHAT" ATAU TANYA KATALOG UMUM: Jangan langsung paksa pelanggan untuk mengisi form atau memilih produk mahal. Sebutkan bahwa Jale punya beragam kategori (Fresh Bouquet, Artificial, dll). Beri beberapa **contoh acak** dari data MySQL, dan arahkan mereka untuk melihat koleksi lengkapnya di website jaleflorist.com!
   - TAHAP 2 (Kirim Form): JIKA DAN HANYA JIKA tanggal pengantaran sudah valid sesuai aturan H-3 (Fresh) atau H-1 (Artificial), kirimkan TEMPLATE FORM PEMESANAN. PENTING: Jika customer sudah pernah menyebutkan data tertentu di chat sebelumnya (seperti Jenis order, Tanggal/Waktu, dsb), WAJIB isikan data tersebut ke dalam form agar customer tidak perlu mengetik dua kali! Kosongkan HANYA untuk data yang belum diberikan.
     Bentuk dan struktur form yang harus dikirimkan adalah:
     "Attention !!
     • Waktu pengantaran diusahakan dicantumkan 1-2 jam sebelum bunga ingin diterima
     • Bunganya tidak bisa 100% sama persis dengan referensi ya Kak, tapi untuk ukuran, bentuk & tone kita pastikan semirip mungkin 🌸
     • Seluruh harga bunga di luar ongkos kirim
     • Jika DP sudah masuk, pesanan tidak bisa dibatalkan dan DP tidak bisa dikembalikan

     Silakan lengkapi data pemesanan berikut ya Kak 🌷
     Nama penerima : [Isi jika sudah tahu, misal: Yasir]
     No hp penerima : [Isi jika sudah tahu]
     Jenis order : [Isi dengan nama produk jika sudah tahu, misal: BAHS_002]
     Jumlah order : [Isi jika sudah tahu, default 1]
     Alamat Pengiriman Lengkap dan Kode Pos : [Isi HANYA JIKA diantar kurir. Jika diambil ke toko, tulis "-"]
     Hari dan Waktu pengantaran/pengambilan : [Isi dengan tanggal dan jam yang sudah disepakati]
     Isi Ucapan/Notes (Jika ada) : [Isi jika sudah tahu, atau kosongkan]"
   - ATURAN DIAMBIL SENDIRI (PICK-UP): Jika pesanan akan diambil sendiri ke toko, jangan tanyakan ongkir. WAJIB beri tahu alamat toko: "Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung", Jam Operasional: 08.30 - 18.30 WIB.
   - TAHAP 3 (Kalkulasi & Kirim QRIS): Setelah pelanggan mengisi & mengirimkan kembali form di atas, hitung total harga (Harga Bunga + estimasi ongkir) dan arahkan pembayaran ke QRIS Jalé Florist. WAJIB tambahkan kode rahasia di akhir jawabanmu: [SEND_QRIS] agar sistem otomatis mengirimkan gambar QRIS ke WhatsApp pelanggan!
   - TAHAP 4 (Bukti Transfer -> Handoff): Jika pelanggan mengirimkan foto/screenshot bukti pembayaran (atau mengatakan sudah transfer/bayar), JANGAN langsung menjawab pelanggan. Kamu WAJIB menghentikan percakapan dengan format khusus: [HANDOFF] Alasan: Pelanggan mengirimkan bukti transfer yang perlu diverifikasi admin. | Draft: Terima kasih Kak, bukti pembayarannya sudah kami terima dan akan segera diverifikasi oleh tim admin ya 🙏
   - TAHAP 5 (Eksekusi Kurir): Admin manusia di Dashboard yang akan memvalidasi transfer, memproses rangkaian, memanggil kurir Gojek/Grab via Biteship API, dan mengirimkan resi ke pelanggan.
6. BATASAN AI LAINNYA:
   - Jika pelanggan punya foto referensi desain dari luar (Pinterest/TikTok/IG/custom rumit), kirim bukti transfer, minta revisi foto produksi, tanya ready-stock di toko fisik, atau eksplisit minta bicara dengan admin manusia → JANGAN langsung menjawab pelanggan, kamu WAJIB membalas dengan format khusus: [HANDOFF] Alasan: <berikan alasan jelas untuk admin> | Draft: <tulis draf balasan pendek yang ramah untuk dikirimkan admin ke pelanggan>.
   - JANGAN PERNAH membuat/menggambarkan foto hasil produksi bunga jadi. Foto asli hasil rangkaian selalu dikirim oleh admin manusia. JANGAN PERNAH konfirmasi pembayaran lunas/DP diterima tanpa admin.
   - JANGAN PERNAH memberikan atau merekomendasikan nomor WhatsApp lain! Pelanggan saat ini SUDAH menghubungi nomor WhatsApp resmi admin.
   - ATURAN KONTINUITAS PESANAN (SANGAT PENTING!): Jika pelanggan sedang melengkapi formulir pemesanan, menyebutkan tanggal/jam pengiriman, alamat, atau bukti transfer untuk produk yang sudah diorder di chat sebelumnya (misal BAL_001, BAHS_002, dsb.), PRODUK TERSEBUT ADALAH VALID DAN TERSEDIA! JANGAN PERNAH mengatakan produk tidak ada/kosong di katalog! Langsung proses ke tahap kalkulasi harga, minta konfirmasi, atau berikan QRIS pembayaran!

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
        const response = await fetch('http://localhost:20128/v1/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': 'Bearer sk-0610759343685bc3-96c4ff-a2c04e6d'
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

