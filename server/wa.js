import { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import { db } from './db.js';
import { askQwenAI } from './ai.js';

export let sock;

export async function connectToWhatsApp() {
    console.log("⏳ Memulai sistem WhatsApp (Mesin Baileys)...");
    const { state, saveCreds } = await useMultiFileAuthState('.baileys_auth');

    sock = makeWASocket({
        auth: state,
        logger: pino({ level: 'silent' }) 
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            console.log('📲 Silakan scan QR Code di bawah ini menggunakan WhatsApp Toko Jalé Florist:');
            qrcode.generate(qr, { small: true });
        }
        
        if (connection === 'close') {
            const shouldReconnect = (lastDisconnect.error instanceof Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Koneksi terputus, menyambung ulang:', shouldReconnect);
            if (shouldReconnect) {
                connectToWhatsApp();
            } else {
                console.log('Anda telah log out. Hapus folder .baileys_auth dan scan ulang.');
            }
        } else if (connection === 'open') {
            console.log('✅ WhatsApp Baileys BERHASIL Terhubung dan Siap Menerima Pesan!');
        }
    });

    // Sinkronisasi riwayat chat lama dinonaktifkan demi stabilitas dan mencegah isu @lid split-brain

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        
        // Jangan proses pesan sistem atau dari diri sendiri
        if (!msg.message || msg.key.fromMe) return;

        // Ambil isi pesan teks
        let text = msg.message.conversation || 
                   msg.message.extendedTextMessage?.text || 
                   "";
                     
        // Jika pelanggan mengirim gambar baru, download secara real-time
        if (msg.message.imageMessage) {
            try {
                const buffer = await downloadMediaMessage(msg, 'buffer', { }, { logger: pino({ level: 'silent' }) });
                const filename = `chat_${Date.now()}_${Math.random().toString(36).substring(7)}.jpeg`;
                fs.writeFileSync(`./public/images/uploads/${filename}`, buffer);
                
                const caption = msg.message.imageMessage.caption ? `${msg.message.imageMessage.caption}\n` : '';
                text = `${caption}[IMAGE]/images/uploads/${filename}`;
            } catch (e) {
                console.error('Gagal download gambar baru:', e.message);
                text = '[Mengirimkan Foto/Bukti Transfer]';
            }
        }
                     
        if (!text) return;

        const senderId = msg.key.remoteJid; // Ini ID utuh yang selalu akurat (baik @c.us maupun @lid)
        const senderName = msg.pushName || "Pelanggan";

        // Filter: Hanya proses private chat, abaikan Grup/Status
        if (senderId.includes('@g.us') || senderId.includes('status@broadcast')) return;

        console.log(`💬 Pesan Masuk dari [${senderId} - ${senderName}]: ${text}`);

        try {
            // A. Pastikan kontak terdaftar
            await db.query(`
                INSERT INTO contacts (no_wa, name, is_ai_active) 
                VALUES (?, ?, TRUE) 
                ON DUPLICATE KEY UPDATE name = ?, last_message_time = CURRENT_TIMESTAMP
            `, [senderId, senderName, senderName]);

            // B. Simpan pesan pelanggan
            // Baileys message ID: msg.key.id
            // Kita simpan JSON string dari keseluruhan msg.key agar bisa di-delete dengan akurat nanti.
            const waMessageId = JSON.stringify(msg.key);
            
            await db.query(`
                INSERT INTO messages (no_wa, sender, message_text, wa_message_id) 
                VALUES (?, 'customer', ?, ?)
            `, [senderId, text, waMessageId]);

            // C. Cek status AI
            const [contacts] = await db.query('SELECT is_ai_active FROM contacts WHERE no_wa = ?', [senderId]);
            const isAiActive = contacts[0]?.is_ai_active;

            if (isAiActive) {
                console.log(`🤖 AI aktif untuk [${senderId}]. Meminta balasan ke Qwen...`);

                const aiResult = await askQwenAI(senderId, text);
                let aiReply = typeof aiResult === 'string' ? aiResult : aiResult.reply;
                aiReply = aiReply.replace(/\*\*/g, '*');
                const products = typeof aiResult === 'string' ? [] : (aiResult.products || []);

                const shouldSendQris = aiReply.includes('[SEND_QRIS]');
                if (shouldSendQris) aiReply = aiReply.replace('[SEND_QRIS]', '').trim();

                if (aiReply.includes('[SILENT_HANDOFF]') || aiReply.includes('[HANDOFF]')) {
                    console.log(`🚨 [HANDOFF] AI butuh bantuan admin. Pelanggan [${senderId}] dialihkan!`);
                    await db.query('UPDATE contacts SET is_ai_active = FALSE WHERE no_wa = ?', [senderId]);
                    await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'admin', ?)`, [senderId, `[ESCALATION]${aiReply}`]);
                    return; // Hentikan proses, jangan kirim pesan apapun ke pelanggan
                }

                // Balas dengan Baileys (Reply/Quote)
                const sentMsg = await sock.sendMessage(senderId, { text: aiReply }, { quoted: msg });
                const aiWaMessageId = JSON.stringify(sentMsg.key);

                // Kirim QRIS jika perlu
                if (shouldSendQris) {
                    try {
                        const qrisPath = './public/images/qris/QRIS-Jale-Florist.jpg';
                        if (fs.existsSync(qrisPath)) {
                            const buffer = fs.readFileSync(qrisPath);
                            const caption = '💳 *QRIS Pembayaran Jalé Florist*\nSilakan scan untuk DP 50% atau Lunas 🙏✨';
                            await sock.sendMessage(senderId, { 
                                image: buffer, 
                                caption: caption 
                            });
                            await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [senderId, `${caption}\n[IMAGE]/images/qris/QRIS-Jale-Florist.jpg`]);
                        }
                    } catch (e) {
                        console.log('⚠️ Gagal mengirim QRIS:', e.message);
                    }
                }

                // Kirim foto rekomendasi
                const isFormOrder = aiReply.includes('Attention !!') || aiReply.includes('Nama penerima');
                if (!shouldSendQris && !isFormOrder && products && products.length > 0) {
                    const aiMentionedProducts = products.filter(p => aiReply.includes(p.name) || aiReply.includes(p.sku));
                    for (const p of aiMentionedProducts.slice(0, 3)) {
                        if (p.image_url) {
                            try {
                                const filePath = './public' + p.image_url; 
                                if (fs.existsSync(filePath)) {
                                    const buffer = fs.readFileSync(filePath);
                                    const caption = `🌸 *${p.name}*\n💰 Harga: Rp ${p.price.toLocaleString('id-ID')}`;
                                    await sock.sendMessage(senderId, { 
                                        image: buffer, 
                                        caption: caption 
                                    });
                                    // Berikan delay kecil agar urutan masuk ke DB dan terbaca oleh React teratur
                                    await new Promise(resolve => setTimeout(resolve, 500));
                                    await db.query(`INSERT INTO messages (no_wa, sender, message_text) VALUES (?, 'ai', ?)`, [senderId, `${caption}\n[IMAGE]${p.image_url}`]);
                                }
                            } catch (errMedia) {
                                console.log(`⚠️ Gagal mengirim foto [${p.image_url}]:`, errMedia.message);
                            }
                        }
                    }
                }

                // Simpan balasan teks AI ke DB
                await db.query(`
                    INSERT INTO messages (no_wa, sender, message_text, wa_message_id) 
                    VALUES (?, 'ai', ?, ?)
                `, [senderId, aiReply, aiWaMessageId]);
                
                console.log(`✅ Balasan AI terkirim ke [${senderId}]!`);
            } else {
                console.log(`🔇 AI nonaktif untuk [${senderId}]. Menunggu Admin...`);
            }
        } catch (error) {
            console.error('❌ Gagal memproses pesan:', error.message);
        }
    });
}
