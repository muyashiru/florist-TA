import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { connectToWhatsApp, sock } from './wa.js';
import { askQwenAI } from './ai.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Auto-migrate schema
try {
    await db.query("ALTER TABLE messages ADD COLUMN wa_message_id VARCHAR(255) DEFAULT NULL");
    console.log("✅ Database schema updated (wa_message_id added)");
} catch (e) {
    // Ignore if column already exists
}

// Konfigurasi Multer untuk upload gambar
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/images/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public')); // Agar foto produk di /images/produk/... bisa diakses browser Sandbox

// 1. API untuk mengambil data produk dari MySQL
app.get('/api/products', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT sku, name, category, size, price, image_url FROM products WHERE available = 1 LIMIT 10');
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ==========================================
// API SKENARIO SANDBOX
// ==========================================
const SCENARIOS_FILE = './sandbox_scenarios.json';

app.get('/api/scenarios', (req, res) => {
    try {
        if (!fs.existsSync(SCENARIOS_FILE)) fs.writeFileSync(SCENARIOS_FILE, JSON.stringify([]));
        const scenarios = JSON.parse(fs.readFileSync(SCENARIOS_FILE));
        res.json({ success: true, scenarios });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/scenarios', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name) return res.status(400).json({ success: false, message: "Nama skenario dibutuhkan" });
        const [messages] = await db.query("SELECT sender, message_text FROM messages WHERE no_wa = '0895339549364_SANDBOX' ORDER BY created_at ASC");
        const scenarios = fs.existsSync(SCENARIOS_FILE) ? JSON.parse(fs.readFileSync(SCENARIOS_FILE)) : [];
        const newScenario = { id: Date.now().toString(), name, messages };
        scenarios.push(newScenario);
        fs.writeFileSync(SCENARIOS_FILE, JSON.stringify(scenarios, null, 2));
        res.json({ success: true, scenario: newScenario });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.post('/api/scenarios/:id/load', async (req, res) => {
    try {
        const { id } = req.params;
        const scenarios = fs.existsSync(SCENARIOS_FILE) ? JSON.parse(fs.readFileSync(SCENARIOS_FILE)) : [];
        const scenario = scenarios.find(s => s.id === id);
        if (!scenario) return res.status(404).json({ success: false, message: "Skenario tidak ditemukan" });
        
        const lastMsg = scenario.messages[scenario.messages.length - 1];
        const isEscalation = lastMsg && lastMsg.message_text.startsWith('[ESCALATION]');
        
        await db.query("DELETE FROM messages WHERE no_wa = '0895339549364_SANDBOX'");
        await db.query("UPDATE contacts SET is_ai_active = ? WHERE no_wa = '0895339549364_SANDBOX'", [isEscalation ? 0 : 1]);
        
        for (const msg of scenario.messages) {
            await db.query("INSERT INTO messages (no_wa, sender, message_text, created_at) VALUES ('0895339549364_SANDBOX', ?, ?, NOW())", [msg.sender, msg.message_text]);
            await new Promise(r => setTimeout(r, 100)); // urutan rapi
        }
        res.json({ success: true, message: "Skenario berhasil diload", messages: scenario.messages });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

app.get('/api/sandbox-history', async (req, res) => {
    try {
        const [messages] = await db.query("SELECT sender, message_text FROM messages WHERE no_wa = '0895339549364_SANDBOX' ORDER BY created_at ASC");
        res.json({ success: true, messages });
    } catch (e) {
        res.json({ success: false, message: e.message });
    }
});

// 2. API SANDBOX (Untuk ngetes balasan AI & melihat kecepatan responnya)
app.post('/api/test-ai', async (req, res) => {
    try {
        const { message, sender = '0895339549364_SANDBOX' } = req.body;
        if (!message) return res.status(400).json({ success: false, message: 'Pesan wajib diisi' });

        // Simpan ke MySQL agar AI punya memori percakapan di Sandbox!
        await db.query(`
            INSERT INTO contacts (no_wa, name, is_ai_active) 
            VALUES (?, 'Sandbox User', TRUE) 
            ON DUPLICATE KEY UPDATE last_message_time = CURRENT_TIMESTAMP
        `, [sender]);

        await db.query(`
            INSERT INTO messages (no_wa, sender, message_text) 
            VALUES (?, 'customer', ?)
        `, [sender, message]);

        const startTime = Date.now();
        // Memanggil fungsi AI yang terhubung ke OmniRoute + MySQL
        const result = await askQwenAI(sender, message);
        let aiReply = typeof result === 'string' ? result : result.reply;
        const products = typeof result === 'string' ? [] : (result.products || []);
        
        const shouldSendQris = aiReply.includes('[SEND_QRIS]');
        if (shouldSendQris) {
            aiReply = aiReply.replace('[SEND_QRIS]', '').trim();
        }

        const isSilentHandoff = aiReply.includes('[SILENT_HANDOFF]') || aiReply.includes('[HANDOFF]');
        if (isSilentHandoff) {
            // Matikan AI otomatis karena butuh bantuan manusia!
            await db.query('UPDATE contacts SET is_ai_active = 0 WHERE no_wa = ?', [sender]);
        }

        // Siapkan string untuk disimpan di DB agar Dashboard bisa merender QRIS dan Katalog
        let textToSave = aiReply;
        if (shouldSendQris) {
            textToSave += '\n[IMAGE]/images/qris/QRIS-Jale-Florist.jpg';
        }
        if (isSilentHandoff) {
            textToSave = '[ESCALATION]' + aiReply; // Simpan log eskalasi beserta alasan dan draft
        }
        
        // Simpan balasan teks utama AI ke MySQL
        await db.query(`
            INSERT INTO messages (no_wa, sender, message_text) 
            VALUES (?, 'ai', ?)
        `, [sender, textToSave]);

        // Simpan gambar rekomendasi 1 per 1 ke MySQL agar dirender seperti WhatsApp asli
        const isFormOrder = aiReply.includes('Attention !!') || aiReply.includes('Nama penerima') || aiReply.includes('Detail Pesanan:') || aiReply.includes('Apakah data pesanan ini sudah benar');
        if (!shouldSendQris && !isSilentHandoff && !isFormOrder && products && products.length > 0) {
            const aiMentionedProducts = products.filter(p => aiReply.includes(p.name) || aiReply.includes(p.sku));
            for (const p of aiMentionedProducts.slice(0, 3)) {
                if (p.image_url) {
                    const caption = `🌸 *${p.name}*\n💰 Harga: Rp ${p.price.toLocaleString('id-ID')}`;
                    await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [sender, `${caption}\n[IMAGE]${p.image_url}`]);
                }
            }
        }

        const durationSeconds = ((Date.now() - startTime) / 1000).toFixed(2);

        res.json({
            success: true,
            sender,
            userMessage: message,
            aiReply: aiReply,
            products: products,
            sendQris: shouldSendQris,
            speed: `${durationSeconds} detik`
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2.b. API RESET CHAT (Hapus riwayat pesan sandbox agar bisa tes skenario baru dari awal)
app.post('/api/reset-chat', async (req, res) => {
    try {
        const { sender = '0895339549364_SANDBOX' } = req.body;
        await db.query('DELETE FROM messages WHERE no_wa = ?', [sender]);
        res.json({ success: true, message: 'Riwayat percakapan berhasil dihapus!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// --- API UNTUK DASHBOARD ADMIN ---

// --- API DASHBOARD OVERVIEW ---

// 1. Ambil Statistik Global
app.get('/api/admin/overview/stats', async (req, res) => {
    try {
        const [totalChatsRows] = await db.query(`SELECT COUNT(DISTINCT no_wa) as total FROM messages WHERE DATE(created_at) = CURDATE()`);
        const totalChats = totalChatsRows[0].total || 0;
        
        const [aiRows] = await db.query(`SELECT COUNT(*) as total FROM contacts WHERE is_ai_active = 1`);
        const aiCount = aiRows[0].total || 0;
        
        const [allContactsRows] = await db.query(`SELECT COUNT(*) as total FROM contacts`);
        const totalContacts = allContactsRows[0].total || 1; 
        const aiPercentage = Math.round((aiCount / totalContacts) * 100);
        
        // Pesanan Aktif: Asumsi adalah pelanggan yang sudah mengisi formulir dan minta handoff (is_ai_active = 0)
        const [activeOrdersRows] = await db.query(`SELECT COUNT(*) as total FROM contacts WHERE is_ai_active = 0`);
        const activeOrders = activeOrdersRows[0].total || 0;

        res.json({ success: true, data: { totalChats, aiPercentage, aiCount, activeOrders } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 2. Ambil Tren & Grafik (Jam Sibuk & Produk Populer)
app.get('/api/admin/overview/trends', async (req, res) => {
    try {
        const { filter = 'hari_ini' } = req.query; // 'hari_ini', 'minggu_ini', 'bulan_ini'
        let dateCondition = "DATE(created_at) = CURDATE()";
        if (filter === 'minggu_ini') dateCondition = "YEARWEEK(created_at, 1) = YEARWEEK(CURDATE(), 1)";
        else if (filter === 'bulan_ini') dateCondition = "YEAR(created_at) = YEAR(CURDATE()) AND MONTH(created_at) = MONTH(CURDATE())";

        // Query Jam Sibuk
        const [hoursRows] = await db.query(`SELECT HOUR(created_at) as hour, COUNT(*) as count FROM messages WHERE ${dateCondition} GROUP BY HOUR(created_at)`);
        
        // Distribusi jam menjadi 7 blok: <9, 9-11, 11-13, 13-15, 15-17, 17-19, >19
        const busyHours = [0,0,0,0,0,0,0]; 
        hoursRows.forEach(row => {
            if (row.hour < 9) busyHours[0] += row.count;
            else if (row.hour >= 9 && row.hour < 11) busyHours[1] += row.count;
            else if (row.hour >= 11 && row.hour < 13) busyHours[2] += row.count;
            else if (row.hour >= 13 && row.hour < 15) busyHours[3] += row.count;
            else if (row.hour >= 15 && row.hour < 17) busyHours[4] += row.count;
            else if (row.hour >= 17 && row.hour < 19) busyHours[5] += row.count;
            else if (row.hour >= 19) busyHours[6] += row.count;
        });
        
        const maxH = Math.max(...busyHours) || 1;
        const normalizedHours = busyHours.map(h => Math.max(1, Math.round((h / maxH) * 12)));

        // Query Produk Populer
        const [productRows] = await db.query(`
            SELECT message_text FROM messages 
            WHERE sender = 'admin' AND message_text LIKE '%Detail Pesanan%' AND ${dateCondition}
        `);
        
        const productCounts = {};
        productRows.forEach(row => {
            const match = row.message_text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan):\*?\s*([^\n]+)/i);
            if (match && match[1]) {
                const p = match[1].replace(/\*/g, '').trim();
                productCounts[p] = (productCounts[p] || 0) + 1;
            }
        });
        
        const topProducts = Object.entries(productCounts)
            .sort((a,b) => b[1] - a[1])
            .slice(0, 3)
            .map(item => ({ name: item[0], count: item[1] }));
            
        if (topProducts.length === 0) {
            topProducts.push({ name: 'Belum ada data', count: 0 });
        }

        res.json({ success: true, data: { busyHours: normalizedHours, topProducts } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. Ambil Daftar Pesanan (Dari form AI di database pesan)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT m.no_wa, m.message_text, m.created_at, c.name as customer_name
            FROM messages m
            JOIN contacts c ON m.no_wa = c.no_wa
            WHERE m.sender = 'admin' AND (m.message_text LIKE '%Detail Pesanan%' OR m.message_text LIKE '%DETAIL PESANAN%')
            ORDER BY m.id DESC LIMIT 50
        `);

        const orders = rows.map((row, index) => {
            const text = row.message_text;
            
            const nameMatch = text.match(/\*?(?:Penerima|Pemesan|Nama|Atas Nama|Nama Penerima|Nama Pemesan):\*?\s*([^\n]+)/i);
            const phoneMatch = text.match(/\*?(?:No HP|No\. HP|Nomor HP):\*?\s*([^\n]+)/i);
            const addrMatch = text.match(/\*?(?:Alamat|Lokasi|Alamat Pengiriman|Alamat Pengiriman Lengkap dan Kode Pos):\*?\s*([^\n]+)/i);
            const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan):\*?\s*([^\n]+)/i);
            const timeMatch = text.match(/\*?(?:Waktu|Tanggal|Hari dan Waktu|Waktu Pengambilan|Waktu Pengantaran):\*?\s*([^\n]+)/i);
            const noteMatch = text.match(/\*?(?:Isi Ucapan|Notes|Ucapan):\*?\s*([^\n]+)/i);
            
            const destName = nameMatch ? nameMatch[1].replace(/\*/g, '').trim() : row.customer_name;
            const destPhone = phoneMatch ? phoneMatch[1].replace(/\*/g, '').trim() : row.no_wa;
            let destAddress = addrMatch ? addrMatch[1].replace(/\*/g, '').trim() : 'Diambil ke toko';
            
            // jika mengandung "Diambil ke toko" override ke Diambil ke toko
            if(text.includes('PENGAMBILAN DI TOKO') || destAddress.toLowerCase().includes('toko')) {
                destAddress = 'Diambil ke toko';
            }
            
            const itemName = itemMatch ? itemMatch[1].replace(/\*/g, '').trim() : 'Pesanan Bunga';
            const deliveryTime = timeMatch ? timeMatch[1].replace(/\*/g, '').trim() : row.created_at;
            const notes = noteMatch ? noteMatch[1].replace(/\*/g, '').trim() : '-';

            return {
                id: (1000 + rows.length - index).toString(),
                product: itemName,
                created_at: row.created_at,
                date: deliveryTime,
                address: destAddress,
                name: destName,
                phone: destPhone,
                notes: notes,
                status: destAddress === 'Diambil ke toko' ? 'Siap Diambil' : 'Perlu Diproses'
            };
        });

        res.json({ success: true, data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 4. Copilot AI
app.post('/api/admin/overview/copilot', async (req, res) => {
    try {
        const { query } = req.body;
        // Mock jawaban copilot
        res.json({ success: true, reply: "Berdasarkan analisis saya, belum ada komplain pelanggan hari ini. Mayoritas pemesanan (60%) adalah Buket Artificial. Apakah ada spesifik pesanan yang ingin dicek?" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ambil semua kontak yang pernah chat
app.get('/api/admin/contacts', async (req, res) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, 
                   (SELECT message_text FROM messages m WHERE m.no_wa = c.no_wa ORDER BY id DESC LIMIT 1) as last_message,
                   (SELECT created_at FROM messages m WHERE m.no_wa = c.no_wa ORDER BY id DESC LIMIT 1) as last_message_time
            FROM contacts c 
            ORDER BY last_message_time DESC
        `);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Ambil riwayat chat dari satu kontak
app.get('/api/admin/messages/:no_wa', async (req, res) => {
    try {
        const { no_wa } = req.params;
        const [rows] = await db.query('SELECT * FROM messages WHERE no_wa = ? ORDER BY id ASC', [no_wa]);
        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Toggle status AI (Aktif/Nonaktif)
app.post('/api/admin/toggle-ai', async (req, res) => {
    try {
        const { no_wa, is_ai_active } = req.body;
        await db.query('UPDATE contacts SET is_ai_active = ? WHERE no_wa = ?', [is_ai_active, no_wa]);
        res.json({ success: true, message: `AI berhasil ${is_ai_active ? 'diaktifkan' : 'dimatikan'}` });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Paksa AI membalas pesan terakhir
app.post('/api/admin/force-ai-reply', async (req, res) => {
    try {
        const { no_wa } = req.body;
        
        // Aktifkan AI di DB
        await db.query('UPDATE contacts SET is_ai_active = 1 WHERE no_wa = ?', [no_wa]);

        // Dapatkan pesan customer terakhir dari DB untuk pemicu, jika tidak ada kirim pesan kosong
        const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? AND sender = "customer" ORDER BY id DESC LIMIT 1', [no_wa]);
        const lastMessage = rows.length > 0 ? rows[0].message_text : "Halo";

        // Panggil Qwen AI (langsung baca dari DB)
        const aiResult = await askQwenAI(no_wa, lastMessage);
        
        let aiReply = typeof aiResult === 'string' ? aiResult : aiResult.reply;
        aiReply = aiReply.replace(/\*\*/g, '*');
        
        const shouldSendQris = aiReply.includes('[SEND_QRIS]');
        if (shouldSendQris) aiReply = aiReply.replace('[SEND_QRIS]', '').trim();

        if (aiReply.includes('[SILENT_HANDOFF]') || aiReply.includes('[HANDOFF]')) {
            await db.query('UPDATE contacts SET is_ai_active = 0 WHERE no_wa = ?', [no_wa]);
            await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'admin', ?)`, [no_wa, `[ESCALATION]${aiReply}`]);
            return res.json({ success: true, message: 'AI tetap butuh bantuan admin, Handoff diaktifkan lagi.' });
        }

        // Simpan balasan teks utama AI ke DB
        let textToSave = aiReply;
        await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [no_wa, textToSave]);

        // Simpan gambar rekomendasi 1 per 1 ke DB
        const isFormOrderAdmin = aiReply.includes('Attention !!') || aiReply.includes('Nama penerima');
        if (!shouldSendQris && !isFormOrderAdmin && aiResult.products && aiResult.products.length > 0) {
            const aiMentionedProducts = aiResult.products.filter(p => aiReply.includes(p.name) || aiReply.includes(p.sku));
            for (const p of aiMentionedProducts.slice(0, 3)) {
                if (p.image_url) {
                    const caption = `🌸 *${p.name}*\n💰 Harga: Rp ${p.price.toLocaleString('id-ID')}`;
                    await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [no_wa, `${caption}\n[IMAGE]${p.image_url}`]);
                }
            }
        }

        // Kirim via WA (jika bukan sandbox)
        if (!no_wa.includes('SANDBOX') && typeof sock !== 'undefined') {
            await sock.sendMessage(no_wa, { text: aiReply });
            if (shouldSendQris) {
                try {
                    const qrisPath = './public/images/qris/QRIS-Jale-Florist.jpg';
                    if (fs.existsSync(qrisPath)) {
                        const buffer = fs.readFileSync(qrisPath);
                        const caption = '💳 *QRIS Pembayaran Jalé Florist*\nSilakan scan untuk DP 50% atau Lunas 🙏✨';
                        await sock.sendMessage(no_wa, { image: buffer, caption: caption });
                        await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [no_wa, `${caption}\n[IMAGE]/images/qris/QRIS-Jale-Florist.jpg`]);
                    }
                } catch (e) {
                    console.log('⚠️ Gagal mengirim QRIS:', e.message);
                }
            }
        }
        
        res.json({ success: true, message: 'AI berhasil merespons pesan.' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Kirim pesan sebagai Admin
app.post('/api/admin/send-message', async (req, res) => {
    try {
        const { no_wa, message, reply_to_id } = req.body;
        
        // Simpan pesan admin ke DB
        const [result] = await db.query(
            'INSERT INTO messages (no_wa, sender, message_text, reply_to_id) VALUES (?, "admin", ?, ?)', 
            [no_wa, message, reply_to_id || null]
        );
        
        // Kirim ke WhatsApp jika sock siap dan bukan nomor sandbox
        if (!no_wa.includes('SANDBOX') && typeof sock !== 'undefined') {
            try {
                let options = {};
                if (reply_to_id) {
                    const [replyRows] = await db.query('SELECT wa_message_id FROM messages WHERE id = ?', [reply_to_id]);
                    if (replyRows.length > 0 && replyRows[0].wa_message_id) {
                        try {
                            const parsedKey = JSON.parse(replyRows[0].wa_message_id);
                            // Baileys requires a full message stub to quote
                            options.quoted = { key: parsedKey, message: { conversation: "" } };
                        } catch(e) {}
                    }
                }
                
                let msgContent = { text: message };
                if (message.includes('[IMAGE]')) {
                    const parts = message.split('[IMAGE]');
                    const captionText = parts[0].trim();
                    const imagePath = parts[1].trim();
                    try {
                        const fs = await import('fs');
                        const fullPath = './public' + imagePath;
                        if (fs.existsSync(fullPath)) {
                            msgContent = {
                                image: fs.readFileSync(fullPath),
                                caption: captionText
                            };
                        }
                    } catch(e) {
                        console.error('Gagal membaca gambar admin:', e.message);
                    }
                }
                
                const sentMsg = await sock.sendMessage(no_wa, msgContent, options);
                
                if (sentMsg && sentMsg.key) {
                    const savedKey = JSON.stringify(sentMsg.key);
                    // Update wa_message_id di database
                    await db.query('UPDATE messages SET wa_message_id = ? WHERE id = ?', [savedKey, result.insertId]);
                    console.log(`📤 Pesan Admin terkirim ke WA [${no_wa}] dgn ID: ${sentMsg.key.id}`);
                } else {
                    console.log(`📤 Perintah kirim dieksekusi ke [${no_wa}], namun WA belum mereturn ID.`);
                }
            } catch (err) {
                console.error("Gagal kirim via WA:", err.message);
            }
        }
        
        res.json({ success: true, message: 'Pesan terkirim', data: { id: result.insertId } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload gambar admin
app.post('/api/admin/upload-image', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
        // Mengembalikan URL lokal untuk gambar yang di-upload
        const fileUrl = '/images/uploads/' + req.file.filename;
        res.json({ success: true, url: fileUrl });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Hapus pesan untuk semua orang (Delete for everyone)
app.delete('/api/admin/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        
        // Cari pesan di database
        const [rows] = await db.query('SELECT * FROM messages WHERE id = ?', [id]);
        if (rows.length === 0) return res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
        
        const msg = rows[0];
        
        if (type === 'for_everyone' && msg.wa_message_id) {
            try {
                const parsedKey = JSON.parse(msg.wa_message_id);
                if (parsedKey && sock) {
                    await sock.sendMessage(msg.no_wa, { delete: parsedKey });
                    console.log(`🗑️ Pesan WA [${parsedKey.id}] berhasil dihapus untuk semua orang`);
                }
            } catch (e) {
                console.error("Gagal menghapus pesan di WhatsApp asli:", e.message);
                // Lanjut ke penghapusan database meskipun gagal di WA
            }
        }
        
        // Hapus dari database (jika for_me) atau update is_deleted_for_everyone
        if (type === 'for_me') {
            await db.query('DELETE FROM messages WHERE id = ?', [id]);
        } else {
            await db.query('UPDATE messages SET is_deleted_for_everyone = 1 WHERE id = ?', [id]);
        }
        
        res.json({ success: true, message: 'Pesan terhapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Pesan kurir Gojek via Biteship
app.post('/api/admin/order-courier', async (req, res) => {
    try {
        const { no_wa } = req.body;
        const BITESHIP_TEST_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSmFsZUZsb3Jpc3QiLCJ1c2VySWQiOiI2YTY3YTJhODliN2QyZjc1MjJlZGE5ZDYiLCJpYXQiOjE3ODUyNjg2ODZ9.EvW8rEdn4IHORDT7PoSLCdEApuw7oTk-yb5zhpU_aZs';
        
        let destName = "Customer Jale";
        let destPhone = no_wa;
        let destAddress = "Jl. Setiabudi No.22, Hegarmanah, Cidadap, Bandung";
        let itemName = "Bouquet Custom";
        let deliveryTimeText = null;
        
        try {
            const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
            for (const row of rows) {
                const text = row.message_text;
                
                // 1. Coba tangkap dari Ringkasan AI (Detail Pesanan:)
                if (text.includes('Detail Pesanan') || text.includes('Detail pesanan') || text.includes('DETAIL PESANAN') || text.includes('Silakan lengkapi data pemesanan')) {
                    const nameMatch = text.match(/\*?(?:Penerima|Pemesan|Nama|Atas Nama|Nama Penerima|Nama Pemesan):\*?\s*([^\n]+)/i);
                    const phoneMatch = text.match(/\*?(?:No HP|No\. HP|Nomor HP):\*?\s*([^\n]+)/i);
                    const addrMatch = text.match(/\*?(?:Alamat|Lokasi|Alamat Pengiriman):\*?\s*([^\n]+)/i);
                    const itemMatch = text.match(/\*?(?:Produk|Item|Jenis Order|Pesanan):\*?\s*([^\n]+)/i);
                    const timeMatch = text.match(/\*?(?:Waktu|Tanggal|Hari dan Waktu|Waktu Pengambilan|Waktu Pengantaran):\*?\s*([^\n]+)/i);
                    
                    if (nameMatch && nameMatch[1]) destName = nameMatch[1].replace(/\([0-9\s\+]+\)/g, '').replace(/\*/g, '').trim();
                    if (phoneMatch && phoneMatch[1]) destPhone = phoneMatch[1].replace(/\*/g, '').trim();
                    if (addrMatch && addrMatch[1]) destAddress = addrMatch[1].replace(/\*/g, '').trim();
                    if (itemMatch && itemMatch[1]) itemName = itemMatch[1].replace(/\*/g, '').trim();
                    if (timeMatch && timeMatch[1]) deliveryTimeText = timeMatch[1].replace(/\*/g, '').trim();
                    
                    if (destName !== "Customer Jale") break; // Stop jika berhasil ketemu
                }
                
                // 2. Fallback: Coba tangkap dari ketikan manual pelanggan (Nama penerima:)
                if (text.includes('Nama penerima') || text.includes('Nama pemesan') || text.includes('Nama')) {
                    const nameMatch = text.match(/Nama(?: penerima| pemesan|)\s*:\s*([^\n]+)/i);
                    const phoneMatch = text.match(/No(?: hp| HP)(?: penerima| pemesan|)\s*:\s*([^\n]+)/i);
                    const addrMatch = text.match(/Alamat(?: Pengiriman|).*?:\s*([^\n]+)/i);
                    const itemMatch = text.match(/Jenis order\s*:\s*([^\n]+)/i);
                    const timeMatch = text.match(/(?:Hari dan |)Waktu (?:pengantaran|pengambilan)(?:.*?):\s*([^\n]+)/i);
                    
                    if (nameMatch && nameMatch[1]) destName = nameMatch[1].trim();
                    if (phoneMatch && phoneMatch[1]) destPhone = phoneMatch[1].trim();
                    if (addrMatch && addrMatch[1]) destAddress = addrMatch[1].trim();
                    if (itemMatch && itemMatch[1]) itemName = itemMatch[1].trim();
                    if (timeMatch && timeMatch[1]) deliveryTimeText = timeMatch[1].trim();
                    break;
                }
            }
        } catch(e) { console.error('Gagal extract formulir:', e); }

        // Data pesanan dummy untuk Sandbox Biteship (memastikan origin dan destination terisi agar sukses)
        const payload = {
            origin_contact_name: "Jalé Florist",
            origin_contact_phone: "0895339549364",
            origin_address: "Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung",
            origin_coordinate: { latitude: -6.9182, longitude: 107.6533 },
            destination_contact_name: destName,
            destination_contact_phone: destPhone || "081233334444",
            destination_address: destAddress,
            destination_coordinate: { latitude: -6.866, longitude: 107.595 },
            couriers: "gojek", // Array of couriers to price/book
            items: [
                { name: itemName, value: 150000, quantity: 1, weight: 1000 }
            ]
        };

        // Note: Untuk /v1/orders, dokumentasi Biteship mungkin mensyaratkan format tertentu.
        // Berdasarkan sandbox, field minimum di atas sering cukup, atau kita gunakan format v1/orders standar:
        // Coba parsing tanggal bahasa Indonesia untuk penjadwalan kurir
        let parsedDeliveryType = "now";
        let parsedDeliveryDate = undefined;
        let parsedDeliveryTime = undefined;
        
        if (deliveryTimeText) {
            const months = { 'januari': '01', 'februari': '02', 'maret': '03', 'april': '04', 'mei': '05', 'juni': '06', 'juli': '07', 'agustus': '08', 'september': '09', 'oktober': '10', 'november': '11', 'desember': '12' };
            const dateMatch = deliveryTimeText.match(/(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})/i);
            const timeMatch = deliveryTimeText.match(/(\d{2})[.:](\d{2})/);
            
            if (dateMatch && timeMatch) {
                const d = dateMatch[1].padStart(2, '0');
                const m = months[dateMatch[2].toLowerCase()] || '01';
                const y = dateMatch[3];
                
                parsedDeliveryDate = `${y}-${m}-${d}`;
                parsedDeliveryTime = `${timeMatch[1]}:${timeMatch[2]}`;
                parsedDeliveryType = "later";
            }
        }

        const isPickup = destAddress && (destAddress.toLowerCase().includes('ambil') || destAddress.toLowerCase().includes('toko') || destAddress.toLowerCase().includes('pickup') || destAddress.toLowerCase().includes('pick-up'));
        
        if (isPickup) {
            console.log("🌸 Mode Ambil di Toko terdeteksi. Bypass API Biteship.");
            let pickupTime = deliveryTimeText || 'Sesuai kesepakatan';
            let msgText = `Halo Kak! Pesanan Kakak sudah kami proses ya 🌸✨\n\n*DETAIL PESANAN*\n🛍️ Item: ${itemName}\n\n*PENGAMBILAN DI TOKO*\n👤 Atas Nama: ${destName}\n📞 No. HP: ${destPhone}\n📅 Waktu Pengambilan: ${pickupTime}\n\n📍 Lokasi Toko:\nJalé Florist\nJl. Cicalengka Raya No.8, Antapani Kidul, Kec. Antapani, Kota Bandung, Jawa Barat 40291\n(Atau bisa cari 'Jalé Florist' di Google Maps)\n\nTerima kasih banyak sudah berbelanja di Jalé Florist! Kami tunggu kedatangannya ya Kak 🌸`;
            
            await db.query(
                'INSERT INTO messages (no_wa, sender, message_text, reply_to_id) VALUES (?, "admin", ?, NULL)', 
                [no_wa, msgText]
            );

            if (!no_wa.includes('SANDBOX') && typeof sock !== 'undefined') {
                try {
                    await sock.sendMessage(no_wa, { text: msgText });
                } catch (err) {
                    console.error("Gagal mengirim notif pickup via WA:", err.message);
                }
            }

            return res.json({ success: true, resi: 'PICKUP', trackingUrl: '-', order_id: 'PICKUP-' + Date.now() });
        }

        const payloadOrder = {
            origin_contact_name: payload.origin_contact_name,
            origin_contact_phone: payload.origin_contact_phone,
            origin_address: payload.origin_address,
            origin_coordinate: payload.origin_coordinate,
            destination_contact_name: payload.destination_contact_name,
            destination_contact_phone: payload.destination_contact_phone,
            destination_address: payload.destination_address,
            destination_coordinate: payload.destination_coordinate,
            courier_company: "gojek",
            courier_type: "instant",
            delivery_type: parsedDeliveryType,
            delivery_date: parsedDeliveryDate,
            delivery_time: parsedDeliveryTime,
            items: payload.items
        };

        const response = await fetch('https://api.biteship.com/v1/orders', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${BITESHIP_TEST_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payloadOrder)
        });

        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || data.message || 'Gagal memanggil Biteship API');
        }

        const resi = data.courier && data.courier.waybill_id ? data.courier.waybill_id : (data.id || 'GOJ-TEST-123');
        // Gunakan field link dari API jika ada, atau buat URL tracking resmi Biteship menggunakan Tracking ID
        const trackingId = data.courier && data.courier.tracking_id ? data.courier.tracking_id : data.id;
        let trackingUrl = data.courier && data.courier.link ? data.courier.link : `https://track.biteship.com/${trackingId}`;
        
        // Tambahkan ?environment=development karena ini API Sandbox
        if (!trackingUrl.includes('environment=')) {
            trackingUrl += '?environment=development';
        }
        
        let dateStr = deliveryTimeText;
        if (!dateStr || dateStr.trim() === '-' || dateStr.trim() === '') {
            const dateObj = new Date();
            dateStr = dateObj.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' WIB';
        }
        const finalDestName = data.destination ? data.destination.contact_name : payloadOrder.destination_contact_name;
        const finalDestAddress = data.destination ? data.destination.address : payloadOrder.destination_address;
        const courierName = data.courier ? (data.courier.company + ' ' + data.courier.type).toUpperCase() : 'GOJEK INSTANT';
        
        let msgText = '';
        if (parsedDeliveryType === 'later') {
            msgText = `Halo Kak! Pesanan Kakak sudah dijadwalkan untuk pengiriman ya 🚚💨

*DETAIL PENGIRIMAN*
📦 Ekspedisi: ${courierName}
📅 Waktu Pick-up: ${dateStr}

*TUJUAN PENGIRIMAN*
👤 Penerima: ${finalDestName}
📞 No. HP: ${payloadOrder.destination_contact_phone}
📍 Alamat: ${finalDestAddress}

Lacak status pesanan Kakak di sini:
👉 ${trackingUrl}

*(Catatan: Karena ini pesanan terjadwal, halaman pelacakan mungkin baru akan aktif atau memunculkan nama kurir pada hari H pengiriman ya, Kak!)*

Terima kasih sudah berbelanja di Jalé Florist! Ditunggu kedatangan bunganya ya 🌸`;
        } else {
            msgText = `Halo Kak! Pesanan Kakak sudah diserahkan ke kurir ya 🚚💨

*DETAIL PENGIRIMAN*
📦 Ekspedisi: ${courierName}
🧾 No Resi: ${resi}
📅 Waktu Pick-up: ${dateStr}

*TUJUAN PENGIRIMAN*
👤 Penerima: ${finalDestName}
📞 No. HP: ${payloadOrder.destination_contact_phone}
📍 Alamat: ${finalDestAddress}

Lacak pengiriman Kakak secara *real-time* di sini:
👉 ${trackingUrl}

Terima kasih sudah berbelanja di Jalé Florist! Ditunggu kedatangan bunganya ya 🌸`;
        }

        // Simpan pesan balasan dari admin ke DB
        const [result] = await db.query(
            'INSERT INTO messages (no_wa, sender, message_text, reply_to_id) VALUES (?, "admin", ?, NULL)', 
            [no_wa, msgText]
        );

        // Kirim resi ke WhatsApp pelanggan jika bukan sandbox
        if (!no_wa.includes('SANDBOX') && typeof sock !== 'undefined') {
            try {
                await sock.sendMessage(no_wa, { text: msgText });
                console.log(`📤 Resi Biteship terkirim ke WA [${no_wa}]`);
            } catch (err) {
                console.error("Gagal kirim resi WA:", err.message);
            }
        }
        // Simpan mapping Order ID ke WhatsApp untuk keperluan Webhook
        try {
            const fs = require('fs');
            const path = require('path');
            const mapPath = path.join(__dirname, '../orders_map.json');
            let ordersMap = {};
            if (fs.existsSync(mapPath)) {
                ordersMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
            }
            ordersMap[data.id] = { no_wa: no_wa, courierName: courierName };
            fs.writeFileSync(mapPath, JSON.stringify(ordersMap, null, 2));
        } catch (err) {
            console.error("Gagal menyimpan mapping order:", err.message);
        }

        res.json({ success: true, resi: resi, trackingUrl: trackingUrl, order_id: data.id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Webhook untuk menerima update status dari Biteship (Misal: Kurir Allocated)
app.post('/api/webhook/biteship', async (req, res) => {
    try {
        const payload = req.body;
        console.log("📥 Menerima Webhook dari Biteship:", payload.event, "| Status:", payload.status);

        // Biteship akan mengirim status 'allocated' atau 'picking_up' ketika kurir didapatkan
        if (payload.event === 'order.status' && (payload.status === 'allocated' || payload.status === 'picking_up')) {
            const orderId = payload.order_id;
            
            const fs = require('fs');
            const path = require('path');
            const mapPath = path.join(__dirname, '../orders_map.json');
            
            if (fs.existsSync(mapPath)) {
                const ordersMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
                const orderData = ordersMap[orderId];
                
                // Cek apakah sudah pernah dinotifikasi agar tidak double chat
                if (orderData && !orderData.notified_allocated) {
                    const no_wa = orderData.no_wa;
                    
                    const trackingId = payload.courier && payload.courier.tracking_id ? payload.courier.tracking_id : payload.order_id;
                    let trackingUrl = payload.courier && payload.courier.link ? payload.courier.link : `https://track.biteship.com/${trackingId}`;
                    
                    if (!trackingUrl.includes('environment=')) {
                        trackingUrl += '?environment=development';
                    }

                    const resi = payload.courier && payload.courier.waybill_id ? payload.courier.waybill_id : (trackingId || '-');

                    const msgText = `Halo Kak! Kabar gembira, kurir untuk pesanan Kakak sudah dialokasikan dan sedang bersiap menuju lokasi penjemputan! 🚚💨

*UPDATE PENGIRIMAN*
🧾 No Resi: ${resi}

Lacak posisi kurir secara *real-time* di sini:
👉 ${trackingUrl}

Terima kasih sudah sabar menunggu ya Kak 🌸`;

                    // Simpan pesan notifikasi ini ke DB agar tampil di Dashboard Jale Florist
                    await db.query(
                        'INSERT INTO messages (no_wa, sender, message_text, reply_to_id) VALUES (?, "admin", ?, NULL)', 
                        [no_wa, msgText]
                    );

                    // Kirim ke WhatsApp pelanggan jika bukan sandbox
                    if (!no_wa.includes('SANDBOX') && typeof sock !== 'undefined') {
                        try {
                            await sock.sendMessage(no_wa, { text: msgText });
                            console.log(`📤 Webhook Resi terkirim ke WA [${no_wa}]`);
                        } catch (err) {
                            console.error("Gagal kirim Webhook Resi WA:", err.message);
                        }
                    }
                    
                    // Tandai agar tidak dikirim ganda
                    ordersMap[orderId].notified_allocated = true;
                    fs.writeFileSync(mapPath, JSON.stringify(ordersMap, null, 2));
                }
            }
        }

        // Biteship membutuhkan respons 200 OK
        res.status(200).send('OK');
    } catch (error) {
        console.error("Error memproses Webhook Biteship:", error);
        res.status(500).send('Internal Server Error');
    }
});

// Hapus pesan (Delete for Me / Delete for Everyone)
app.delete('/api/admin/messages/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body; // 'for_me' or 'for_everyone'
        
        if (type === 'for_everyone') {
            await db.query('UPDATE messages SET is_deleted_for_everyone = 1 WHERE id = ?', [id]);
        } else {
            await db.query('UPDATE messages SET is_deleted_by_admin = 1 WHERE id = ?', [id]);
        }
        
        res.json({ success: true, message: 'Pesan berhasil dihapus' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// 3. HALAMAN WEB INTERAKTIF SANDBOX (Tampilan UI Chat untuk Testing)
app.get('/sandbox', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
        <meta charset="UTF-8"><title>🧪 Sandbox AI - Jalé Florist</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            * { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .chat-bg { background-image: url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png'); background-size: contain; }
            
            .msg-wrapper { display: flex; width: 100%; margin-bottom: 5px; }
            .msg { padding: 8px 12px; border-radius: 8px; max-width: 70%; font-size: 14.5px; line-height: 20px; position: relative; box-shadow: 0 1px 1px rgba(11,20,26,0.1); word-wrap: break-word; color: #111b21; }
            
            .msg.user { background: #d9fdd3; margin-left: auto; border-top-right-radius: 0; }
            .msg.user::before { content: ""; position: absolute; top: 0; right: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-left: 8px solid #d9fdd3; border-bottom: 10px solid transparent; }
            
            .msg.ai { background: #ffffff; margin-right: auto; border-top-left-radius: 0; }
            .msg.ai::before { content: ""; position: absolute; top: 0; left: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-right: 8px solid #ffffff; border-bottom: 10px solid transparent; }
            
            .msg.admin { background: #fff3cd; margin-right: auto; border-top-left-radius: 0; border-left: 4px solid #f39c12; }
            .msg.admin::before { content: ""; position: absolute; top: 0; left: -8px; width: 0; height: 0; border-top: 0px solid transparent; border-right: 8px solid #f39c12; border-bottom: 10px solid transparent; }
            
            .msg-sender { font-size: 12px; font-weight: 600; margin-bottom: 4px; color: #00a884; }
            .msg.admin .msg-sender { color: #d35400; }

            .custom-select-wrapper.open .custom-select { border-color: #00a884; box-shadow: 0 0 0 4px rgba(0, 168, 132, 0.15); }
            .custom-select-wrapper.open .custom-select svg { transform: rotate(180deg); }
            .custom-select-options { opacity: 0; visibility: hidden; transform: translateY(-10px); transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1); }
            .custom-select-wrapper.open .custom-select-options { opacity: 1; visibility: visible; transform: translateY(0); }
            .custom-select-options::-webkit-scrollbar { width: 6px; }
            .custom-select-options::-webkit-scrollbar-track { background: transparent; }
            .custom-select-options::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 10px; }
        </style>
    </head>
    <body class="m-0 bg-[#e5ddd5] flex items-center justify-center h-screen overflow-hidden">
        <div class="w-full max-w-5xl flex bg-white shadow-2xl overflow-hidden h-[95vh] rounded-[20px]">
            <!-- LEFT PANEL -->
            <div class="w-[320px] bg-slate-50 flex flex-col border-r border-slate-300">
                <div class="bg-emerald-600 text-white p-6 text-center font-semibold text-xl flex flex-col gap-1">
                    🧪 Sandbox AI 
                    <span class="text-[13px] font-normal opacity-90">Jalé Florist Testing Mode</span>
                </div>
                <div class="p-6 flex flex-col gap-4 h-full relative z-10">
                    <div class="relative w-full custom-select-wrapper" id="scenarioDropdownWrapper">
                        <div class="flex justify-between items-center px-4 py-3.5 border-2 border-slate-200 rounded-xl bg-white cursor-pointer text-slate-800 font-semibold text-sm transition-all shadow-sm custom-select hover:border-slate-300" id="customSelectLabel" onclick="toggleDropdown()">
                            <span class="truncate">-- Pilih Skenario --</span>
                            <svg class="w-[18px] h-[18px] min-w-[18px] transition-transform stroke-slate-500" viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </div>
                        <ul class="absolute top-[calc(100%+8px)] left-0 right-0 bg-white rounded-xl shadow-lg border border-slate-200 max-h-[250px] overflow-y-auto custom-select-options list-none p-1.5 m-0 z-50" id="scenarioList">
                            <!-- Options akan diisi oleh JS -->
                        </ul>
                    </div>
                    <input type="hidden" id="scenarioSelect" value="">
                    <button onclick="loadScenario()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-white transition-all shadow-sm bg-teal-700 hover:-translate-y-px hover:shadow-md active:translate-y-px">📂 Muat Skenario</button>
                    <button onclick="saveScenario()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-slate-900 transition-all shadow-sm bg-[#25D366] hover:-translate-y-px hover:shadow-md active:translate-y-px">💾 Simpan Skenario Ini</button>
                    
                    <button onclick="resetChat()" class="px-4 py-3.5 rounded-lg font-semibold text-sm text-white transition-all shadow-sm bg-red-500 hover:-translate-y-px hover:shadow-md active:translate-y-px mt-auto">🗑️ Reset Obrolan</button>
                </div>
            </div>

            <!-- RIGHT PANEL -->
            <div class="flex-1 flex flex-col bg-[#efeae2] relative z-0">
                <div class="bg-slate-50 py-3 px-5 flex items-center gap-4 border-b border-slate-300">
                    <div class="w-11 h-11 bg-emerald-600 rounded-full flex items-center justify-center text-white font-bold text-lg">J</div>
                    <div class="flex flex-col">
                        <div class="font-bold text-[16px] text-[#111b21]">Jalé Florist</div>
                        <div class="text-[13px] text-[#667781]">online (AI Assistant Active)</div>
                    </div>
                </div>

                <div class="flex-1 overflow-y-auto p-7 flex flex-col gap-3 chat-bg" id="chatBox">
                    <div class="msg-wrapper"><div class="msg ai"><div class="msg-sender">~ AI Assistant</div>🤖 Halo! Saya AI Jalé Florist di dalam mode Sandbox. Mau tes tanya apa hari ini? 🌸</div></div>
                </div>
                
                <div class="bg-slate-50 py-3 px-5 flex gap-3 items-center border-t border-slate-300">
                    <input type="file" id="photoInput" accept="image/*" style="display:none;" onchange="sendPhoto(event)">
                    <button onclick="document.getElementById('photoInput').click()" class="w-11 h-11 rounded-full border-none cursor-pointer flex items-center justify-center bg-transparent transition-all text-[#54656f] hover:bg-slate-200 hover:text-emerald-600" title="Kirim Foto">
                        <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor"><path d="M21.2 7.2H17l-1.5-1.5c-.3-.3-.7-.5-1.1-.5h-4.8c-.4 0-.8.2-1.1.5L7 7.2H2.8c-.4 0-.8.3-.8.8v11.2c0 .4.4.8.8.8h18.4c.4 0 .8-.4.8-.8V8c0-.5-.3-.8-.8-.8zm-9.2 10c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8.5c-1.9 0-3.5 1.6-3.5 3.5s1.6 3.5 3.5 3.5 3.5-1.6 3.5-3.5-1.6-3.5-3.5-3.5z"></path></svg>
                    </button>
                    <textarea id="msgInput" rows="1" placeholder="Ketik pesan pelanggan..." class="flex-1 py-3 px-4 border-none rounded-3xl resize-none outline-none text-[15px] max-h-[100px] bg-white shadow-sm placeholder-[#8696a0]" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendMsg();}"></textarea>
                    <button onclick="sendMsg()" id="btnSend" class="w-10 h-10 rounded-full border-none cursor-pointer flex items-center justify-center transition-all bg-emerald-600 text-white hover:bg-emerald-700 hover:scale-105 p-2.5">
                        <svg class="w-full h-full fill-current" viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"></path></svg>
                    </button>
                </div>
            </div>
        </div>

        <script>
            let lastMessageCount = 0;

            async function fetchScenarios() {
                const res = await fetch('/api/scenarios');
                const data = await res.json();
                const list = document.getElementById('scenarioList');
                list.innerHTML = '<li class="px-3 py-3 rounded-lg cursor-pointer text-[13.5px] text-slate-700 transition-colors border-b border-transparent mb-0.5 hover:bg-slate-100 hover:text-slate-900" onclick="selectOption(\\\'NEW\\\', \\\'✨ -- Mulai Skenario Baru (Kosong) --\\\')">✨ -- Mulai Skenario Baru (Kosong) --</li>';
                if(data.scenarios) {
                    data.scenarios.forEach(s => {
                        const escapedName = s.name.replace(/'/g, "\\\\\\'").replace(/"/g, '&quot;');
                        list.innerHTML += '<li class="px-3 py-3 rounded-lg cursor-pointer text-[13.5px] text-slate-700 transition-colors border-b border-transparent mb-0.5 hover:bg-slate-100 hover:text-slate-900" onclick="selectOption(\\\''+s.id+'\\\', \\\''+escapedName+'\\\')">'+s.name+'</li>';
                    });
                }
            }
            
            function toggleDropdown() {
                document.getElementById('scenarioDropdownWrapper').classList.toggle('open');
            }
            
            function selectOption(value, label) {
                document.getElementById('scenarioSelect').value = value;
                document.querySelector('#customSelectLabel span').innerText = label;
                document.getElementById('scenarioDropdownWrapper').classList.remove('open');
            }
            
            document.addEventListener('click', function(e) {
                const wrapper = document.getElementById('scenarioDropdownWrapper');
                if (wrapper && !wrapper.contains(e.target)) {
                    wrapper.classList.remove('open');
                }
            });

            async function saveScenario() {
                const name = prompt("Masukkan nama skenario ini:");
                if(!name) return;
                const reqRes = await fetch('/api/scenarios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
                const reqData = await reqRes.json();
                if (!reqData.success) { alert('Gagal menyimpan: ' + reqData.message); return; }
                alert('Skenario berhasil disimpan! Memori akan direset untuk skenario baru.');
                fetchScenarios();
                await fetch('/api/reset-chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
                fetchHistory();
            }
            
            async function loadScenario() {
                const id = document.getElementById('scenarioSelect').value;
                if(!id) return alert('Pilih skenario dulu!');
                if(id === 'NEW') { resetChat(); return; }
                if(!confirm('Load skenario ini? Obrolan saat ini akan tertimpa.')) return;
                const res = await fetch('/api/scenarios/'+id+'/load', { method: 'POST' });
                const data = await res.json();
                if(data.success) {
                    renderHistory(data.messages);
                    alert('Skenario berhasil diload!');
                }
            }

            async function fetchHistory() {
                const res = await fetch('/api/sandbox-history');
                const data = await res.json();
                if (data.success) {
                    if (data.messages.length !== lastMessageCount) {
                        renderHistory(data.messages);
                        lastMessageCount = data.messages.length;
                    }
                }
            }

            function renderHistory(messages) {
                const box = document.getElementById('chatBox');
                box.innerHTML = '';
                if(messages.length === 0) {
                    box.innerHTML = '<div class="msg-wrapper"><div class="msg ai"><div class="msg-sender">AI Assistant</div>🤖 Memori percakapan Sandbox telah direset! Mau tes skenario apa sekarang? 🌸</div></div>';
                    return;
                }

                messages.forEach(m => {
                    const isUser = m.sender === 'customer';
                    const cssClass = isUser ? 'user' : (m.sender === 'admin' ? 'admin' : 'ai');
                    const senderName = isUser ? '' : (m.sender === 'admin' ? '<div class="msg-sender">~ Human Agent (Admin)</div>' : '<div class="msg-sender">~ AI Assistant</div>');
                    
                    let displayMsg = m.message_text.replace(/\\n/g, '<br/>');
                    
                    if(displayMsg.includes('[IMAGE]')) {
                        const parts = displayMsg.split('[IMAGE]');
                        displayMsg = parts[0] + '<br/><img src="'+parts[1]+'" style="max-width: 200px; border-radius: 8px; display:block; margin-top: 8px;" />';
                    }
                    if(displayMsg.includes('[KATALOG]')) {
                        displayMsg = displayMsg.split('[KATALOG]')[0];
                    }
                    if(displayMsg.includes('[ESCALATION]')) {
                        let cleanMsg = displayMsg.replace('[ESCALATION]', '').trim();
                        let alasanMatch = cleanMsg.match(/Alasan:\\s*(.*?)(?=\\s*\\|\\s*Draft:|$)/is);
                        let alasan = alasanMatch ? alasanMatch[1].replace(/\\[HANDOFF\\]|\\[SILENT_HANDOFF\\]/g, '').trim() : cleanMsg.replace(/\\[HANDOFF\\]|\\[SILENT_HANDOFF\\]/g, '').trim();
                        displayMsg = '<div style="color:#d35400; font-weight:bold; font-size:12px; margin-bottom:5px;">🚨 AI BERHENTI (ESKALASI)</div><div style="font-size:13px; color:#e67e22;"><b>Alasan:</b> ' + alasan + '</div><div style="font-size:11px; margin-top:5px; color:#7f8c8d;">(Di WhatsApp asli, pesan ini tidak terkirim ke customer)</div>';
                    }

                    box.innerHTML += '<div class="msg-wrapper"><div class="msg ' + cssClass + '">' + senderName + displayMsg + '</div></div>';
                });
                box.scrollTop = box.scrollHeight;
            }

            fetchScenarios();
            fetchHistory();
            setInterval(fetchHistory, 2000);

            let isProcessing = false;

            async function resetChat() {
                if (!confirm('Hapus riwayat percakapan Sandbox agar mulai dari awal?')) return;
                await fetch('/api/reset-chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
                fetchHistory();
            }
            
            async function sendPhoto(e) {
                if (isProcessing) return;
                const file = e.target.files[0];
                if (!file) return;
                let caption = prompt("Masukkan pesan/keterangan untuk dikirim bersama foto ini (opsional):");
                if (caption === null) return; 
                caption = caption.trim();
                
                const url = URL.createObjectURL(file);
                const box = document.getElementById('chatBox');
                
                const displayText = caption ? '[Gambar] ' + caption : '[Gambar]';
                const aiMessage = caption ? '[Mengirimkan Foto] ' + caption : '[Mengirimkan Foto]';
                
                box.innerHTML += '<div class="msg-wrapper"><div class="msg user"><img src="' + url + '" style="max-width: 200px; border-radius: 8px; display:block; margin-bottom: 5px;" />' + displayText.split('\\n').join('<br/>') + '</div></div>';
                box.scrollTop = box.scrollHeight;
                await processAiRequest(aiMessage);
            }
            
            async function sendMsg() {
                if (isProcessing) return;
                const input = document.getElementById('msgInput');
                const text = input.value.trim();
                if(!text) return;
                
                document.getElementById('chatBox').innerHTML += '<div class="msg-wrapper"><div class="msg user">' + text.split('\\n').join('<br/>') + '</div></div>';
                input.value = '';
                document.getElementById('chatBox').scrollTop = document.getElementById('chatBox').scrollHeight;
                
                await processAiRequest(text);
            }
            
            async function processAiRequest(text) {
                isProcessing = true;
                const box = document.getElementById('chatBox');
                const btn = document.getElementById('btnSend');
                const loadingId = 'load_' + Date.now();
                
                box.innerHTML += '<div class="msg-wrapper" id="' + loadingId + '"><div class="msg ai"><div class="msg-sender">~ AI Assistant</div>🤖 Sedang mengetik...</div></div>';
                box.scrollTop = box.scrollHeight;
                btn.disabled = true;

                try {
                    await fetch('/api/test-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    setTimeout(fetchHistory, 500);
                } catch(e) {
                    document.getElementById(loadingId).innerHTML = '<div class="msg-wrapper"><div class="msg ai">❌ Gagal: ' + e.message + '</div></div>';
                }
                btn.disabled = false;
                isProcessing = false;
            }
            
            document.getElementById('msgInput').addEventListener('paste', async function(e) {
                if (isProcessing) return;
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            let caption = prompt("Masukkan pesan/keterangan untuk dikirim bersama foto ini (opsional):");
                            if (caption === null) return; 
                            caption = caption.trim();
                            
                            const url = URL.createObjectURL(file);
                            const box = document.getElementById('chatBox');
                            
                            const displayText = caption ? '[Gambar] ' + caption : '[Gambar]';
                            const aiMessage = caption ? '[Mengirimkan Foto] ' + caption : '[Mengirimkan Foto]';
                            
                            box.innerHTML += '<div class="msg-wrapper"><div class="msg user"><img src="' + url + '" style="max-width: 200px; border-radius: 8px; display:block; margin-bottom: 5px;" />' + displayText.split('\\n').join('<br/>') + '</div></div>';
                            box.scrollTop = box.scrollHeight;
                            await processAiRequest(aiMessage);
                        }
                        break;
                    }
                }
            });
        </script>
    </body>
    </html>
    `);
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server Backend berjalan di http://localhost:${PORT}`);
    console.log(`🧪 MODE SANDBOX AKTIF: Buka http://localhost:${PORT}/sandbox di browser Anda!`);
    // connectToWhatsApp(); // Menyalakan klien WhatsApp Web via Baileys (dinonaktifkan sementara untuk testing)
});
