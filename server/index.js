import express from 'express';
import cors from 'cors';
import { db } from './db.js';
import { connectToWhatsApp, sock } from './wa.js';
import { askQwenAI } from './ai.js';
import multer from 'multer';
import path from 'path';

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
        
        await db.query("DELETE FROM messages WHERE no_wa = '0895339549364_SANDBOX'");
        await db.query("UPDATE contacts SET is_ai_active = 1 WHERE no_wa = '0895339549364_SANDBOX'");
        
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

        const isHandoff = aiReply.includes('[HANDOFF]');
        if (isHandoff) {
            aiReply = aiReply.replace('[HANDOFF]', '').trim();
            // Matikan AI otomatis karena butuh bantuan manusia!
            await db.query('UPDATE contacts SET is_ai_active = 0 WHERE no_wa = ?', [sender]);
        }

        // Siapkan string untuk disimpan di DB agar Dashboard bisa merender QRIS dan Katalog
        let textToSave = aiReply;
        if (shouldSendQris) {
            textToSave += '\n[IMAGE]/images/qris/QRIS-Jale-Florist.jpg';
        }
        if (isHandoff) {
            textToSave += '\n[ESCALATION]';
        }
        
        // HANYA tampilkan visual katalog jika AI benar-benar menyebutkan nama/sku produk tersebut di balasannya
        if (products && products.length > 0) {
            const aiMentionedProducts = products.filter(p => aiReply.includes(p.name) || aiReply.includes(p.sku));
            if (aiMentionedProducts.length > 0) {
                textToSave += '\n[KATALOG]' + JSON.stringify(aiMentionedProducts.slice(0, 3));
            }
        }

        // Simpan balasan AI ke MySQL agar diingat pada chat berikutnya!
        await db.query(`
            INSERT INTO messages (no_wa, sender, message_text) 
            VALUES (?, 'ai', ?)
        `, [sender, textToSave]);

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
        let destAddress = "Jl. Setiabudi No.22, Hegarmanah, Cidadap, Bandung";
        let itemName = "Bouquet Custom";
        let deliveryTimeText = null;
        
        try {
            const [rows] = await db.query('SELECT message_text FROM messages WHERE no_wa = ? ORDER BY id DESC LIMIT 20', [no_wa]);
            for (const row of rows) {
                const text = row.message_text;
                
                // 1. Coba tangkap dari Ringkasan AI (Detail Pesanan:)
                if (text.includes('Detail Pesanan')) {
                    const nameMatch = text.match(/\*?Penerima:\*?\s*([^\n]+)/i);
                    const addrMatch = text.match(/\*?Alamat:\*?\s*([^\n]+)/i);
                    const itemMatch = text.match(/\*?Produk:\*?\s*([^\n]+)/i);
                    const timeMatch = text.match(/\*?Waktu:\*?\s*([^\n]+)/i);
                    
                    if (nameMatch && nameMatch[1]) destName = nameMatch[1].replace(/\([0-9\s\+]+\)/g, '').replace(/\*/g, '').trim();
                    if (addrMatch && addrMatch[1]) destAddress = addrMatch[1].replace(/\*/g, '').trim();
                    if (itemMatch && itemMatch[1]) itemName = itemMatch[1].replace(/\*/g, '').trim();
                    if (timeMatch && timeMatch[1]) deliveryTimeText = timeMatch[1].replace(/\*/g, '').trim();
                    
                    if (destName !== "Customer Jale") break; // Stop jika berhasil ketemu
                }
                
                // 2. Fallback: Coba tangkap dari ketikan manual pelanggan (Nama penerima:)
                if (text.includes('Nama penerima')) {
                    const nameMatch = text.match(/Nama penerima\s*:\s*([^\n]+)/i);
                    const addrMatch = text.match(/Alamat.*?:\s*([^\n]+)/i);
                    const itemMatch = text.match(/Jenis order\s*:\s*([^\n]+)/i);
                    const timeMatch = text.match(/(?:Hari dan |)Waktu pengantaran\s*:\s*([^\n]+)/i);
                    
                    if (nameMatch && nameMatch[1]) destName = nameMatch[1].trim();
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
            origin_address: "Jl. Cibogo Atas No. 99, Sukawarna, Sukajadi, Bandung",
            origin_coordinate: { latitude: -6.892, longitude: 107.575 },
            destination_contact_name: destName,
            destination_contact_phone: no_wa || "081233334444",
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
        // Gunakan field link dari API jika ada, atau buat URL tracking resmi Biteship menggunakan Order ID
        let trackingUrl = data.courier && data.courier.link ? data.courier.link : `https://track.biteship.com/${data.id}`;
        
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
        
        const msgText = `Halo Kak! Pesanan Kakak sudah ${parsedDeliveryType === 'later' ? 'dijadwalkan untuk pengiriman' : 'diserahkan ke kurir'} ya 🚚💨

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

        res.json({ success: true, resi: resi, trackingUrl: trackingUrl, order_id: data.id });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
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
        <style>
            body { font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; background: #FAF7F3; padding: 20px; }
            .chat-box { background: white; border: 2px solid #DCC5B2; border-radius: 10px; height: 400px; overflow-y: auto; padding: 15px; margin-bottom: 15px; }
            .msg { margin: 10px 0; padding: 10px 15px; border-radius: 15px; max-width: 80%; }
            .user { background: #D9A299; color: white; margin-left: auto; text-align: right; }
            .ai { background: #F0E4D3; color: #333; margin-right: auto; white-space: pre-wrap; }
            .admin { background: #ffebd2; color: #d35400; margin-right: auto; white-space: pre-wrap; border-left: 4px solid #d35400; }
            .meta { font-size: 11px; color: #666; margin-top: 5px; }
            .input-box { display: flex; gap: 10px; align-items: flex-end; margin-bottom: 15px; }
            textarea { flex: 1; padding: 12px; border: 2px solid #DCC5B2; border-radius: 8px; font-size: 15px; font-family: inherit; resize: none; }
            button { background: #D9A299; color: white; border: none; padding: 12px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; height: 45px; }
            button:hover { background: #c88a80; }
            .tools-box { display: flex; gap: 10px; background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd; align-items: center; }
            select { padding: 8px; border-radius: 6px; border: 1px solid #ccc; flex: 1; }
        </style>
    </head>
    <body>
        <h2>🧪 Sandbox AI Testing (OmniRoute + MySQL)</h2>
        <p style="font-size: 13px; color: #666;">Mode pengujian tanpa WhatsApp. Tes sepuasnya untuk melihat respon AI & menyimpan skenario!</p>
        
        <div class="tools-box">
            <button onclick="saveScenario()" style="background: #27ae60; height: 38px; padding: 8px 12px;">💾 Simpan Skenario</button>
            <select id="scenarioSelect"><option value="">-- Pilih Skenario Tersimpan --</option></select>
            <button onclick="loadScenario()" style="background: #2980b9; height: 38px; padding: 8px 12px;">📂 Load Skenario</button>
        </div>

        <div class="chat-box" id="chatBox">
            <div class="msg ai">🤖 Halo! Saya AI Jalé Florist di dalam mode Sandbox. Mau tes tanya apa hari ini? 🌸</div>
        </div>
        <div class="input-box">
            <input type="file" id="photoInput" accept="image/*" style="display:none;" onchange="sendPhoto(event)">
            <textarea id="msgInput" rows="2" placeholder="Ketik pesan di sini... (Shift+Enter untuk baris baru)" onkeydown="if(event.key==='Enter' && !event.shiftKey){event.preventDefault(); sendMsg();}"></textarea>
            <button onclick="document.getElementById('photoInput').click()" style="background: #88c0d0; color: #fff;" title="Kirim Foto Bukti">📸 Foto</button>
            <button onclick="sendMsg()" id="btnSend">Kirim</button>
            <button onclick="resetChat()" style="background: #e74c3c;">🗑️ Reset Memori</button>
        </div>
        <script>
            // --- Skenario Logic ---
            async function fetchScenarios() {
                const res = await fetch('/api/scenarios');
                const data = await res.json();
                const sel = document.getElementById('scenarioSelect');
                sel.innerHTML = '<option value="">-- Pilih Skenario Tersimpan --</option>';
                if(data.scenarios) {
                    data.scenarios.forEach(s => {
                        sel.innerHTML += '<option value="'+s.id+'">'+s.name+'</option>';
                    });
                }
            }
            async function saveScenario() {
                const name = prompt("Masukkan nama skenario ini:");
                if(!name) return;
                await fetch('/api/scenarios', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({name}) });
                alert('Skenario berhasil disimpan!');
                fetchScenarios();
            }
            async function loadScenario() {
                const id = document.getElementById('scenarioSelect').value;
                if(!id) return alert('Pilih skenario dulu!');
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
                if (data.success && data.messages.length > 0) renderHistory(data.messages);
            }
            function renderHistory(messages) {
                const box = document.getElementById('chatBox');
                box.innerHTML = '';
                messages.forEach(m => {
                    const cssClass = m.sender === 'customer' ? 'user' : (m.sender === 'admin' ? 'admin' : 'ai');
                    let displayMsg = m.message_text.replace(/\\n/g, '<br/>');
                    if(displayMsg.includes('[IMAGE]')) {
                        const parts = displayMsg.split('[IMAGE]');
                        displayMsg = parts[0] + '<br/><img src="'+parts[1]+'" style="max-width: 160px; border-radius: 6px; display:block; margin-top: 5px;" />';
                    }
                    if(displayMsg.includes('[KATALOG]')) {
                        const parts = displayMsg.split('[KATALOG]');
                        displayMsg = parts[0];
                    }
                    if(displayMsg.includes('[ESCALATION]')) displayMsg = displayMsg.replace('[ESCALATION]', '');
                    box.innerHTML += '<div class="msg ' + cssClass + '">' + displayMsg + '</div>';
                });
                box.scrollTop = box.scrollHeight;
            }

            // --- Chat Logic ---
            fetchScenarios();
            fetchHistory();

            async function resetChat() {
                if (!confirm('Hapus riwayat percakapan Sandbox agar mulai dari awal?')) return;
                await fetch('/api/reset-chat', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({}) });
                document.getElementById('chatBox').innerHTML = '<div class="msg ai">🤖 Memori percakapan Sandbox telah direset! Mau tes skenario apa sekarang? 🌸</div>';
            }
            async function sendPhoto(e) {
                const file = e.target.files[0];
                if (!file) return;
                const url = URL.createObjectURL(file);
                const box = document.getElementById('chatBox');
                box.innerHTML += '<div class="msg user"><img src="' + url + '" style="max-width: 160px; border-radius: 6px; display:block; margin-bottom: 5px;" />[Mengirimkan Foto/Bukti Transfer]</div>';
                box.scrollTop = box.scrollHeight;
                await processAiRequest('[Mengirimkan Foto/Bukti Transfer]');
            }
            async function sendMsg() {
                const input = document.getElementById('msgInput');
                const text = input.value.trim();
                if(!text) return;
                document.getElementById('chatBox').innerHTML += '<div class="msg user">' + text.split('\\n').join('<br/>') + '</div>';
                input.value = '';
                await processAiRequest(text);
            }
            async function processAiRequest(text) {
                const box = document.getElementById('chatBox');
                const btn = document.getElementById('btnSend');
                const loadingId = 'load_' + Date.now();
                box.innerHTML += '<div class="msg ai" id="' + loadingId + '">🤖 Sedang berpikir...</div>';
                box.scrollTop = box.scrollHeight;

                try {
                    const res = await fetch('/api/test-ai', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ message: text })
                    });
                    const data = await res.json();
                    setTimeout(() => fetchHistory(), 1000); // Reload history to get proper rendered AI response from DB
                } catch(e) {
                    document.getElementById(loadingId).innerText = '❌ Gagal: ' + e.message;
                }
                btn.innerText = 'Kirim'; btn.disabled = false;
            }
            document.getElementById('msgInput').addEventListener('paste', async function(e) {
                const items = (e.clipboardData || e.originalEvent.clipboardData).items;
                for (const item of items) {
                    if (item.type.indexOf('image') === 0) {
                        e.preventDefault();
                        const file = item.getAsFile();
                        if (file) {
                            const url = URL.createObjectURL(file);
                            const box = document.getElementById('chatBox');
                            box.innerHTML += '<div class="msg user"><img src="' + url + '" style="max-width: 160px; border-radius: 6px; display:block; margin-bottom: 5px;" />[Mengirimkan Foto/Bukti Transfer (via Paste)]</div>';
                            box.scrollTop = box.scrollHeight;
                            await processAiRequest('[Mengirimkan Foto/Bukti Transfer]');
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
    connectToWhatsApp(); // Menyalakan klien WhatsApp Web via Baileys
});
