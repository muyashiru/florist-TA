const mysql = require('mysql2/promise');
const crypto = require('crypto');
const fs = require('fs');

const BITESHIP_TEST_KEY = 'biteship_test.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSmFsZUZsb3Jpc3QiLCJ1c2VySWQiOiI2YTY3YTJhODliN2QyZjc1MjJlZGE5ZDYiLCJpYXQiOjE3ODUyNjg2ODZ9.EvW8rEdn4IHORDT7PoSLCdEApuw7oTk-yb5zhpU_aZs';

const BANDUNG_DISTRICTS = [
    { name: "Andir", lat: -6.9175, lon: 107.5768, postal: 40181 },
    { name: "Antapani", lat: -6.9171, lon: 107.6565, postal: 40291 },
    { name: "Astanaanyar", lat: -6.9318, lon: 107.5996, postal: 40242 },
    { name: "Coblong", lat: -6.8841, lon: 107.6133, postal: 40132 },
    { name: "Regol", lat: -6.9366, lon: 107.6069, postal: 40252 },
    { name: "Sukasari", lat: -6.8669, lon: 107.5858, postal: 40151 },
    { name: "Buahbatu", lat: -6.9535, lon: 107.6433, postal: 40286 },
    { name: "Ujungberung", lat: -6.9144, lon: 107.6963, postal: 40611 }
];

const FULL_ADDRESSES = [
    "Jl. Setiabudi No.22, Hegarmanah, Cidadap",
    "Jl. Dipati Ukur No. 84, RT 01/RW 04, Kel. Lebakgede, Kec. Coblong",
    "Jl. Cihampelas No.160, Cipaganti, Coblong",
    "Jl. Pasundan No.137, Balonggede, Regol",
    "Jl. Buah Batu No.210, Cijagra, Lengkong",
    "Jl. Kopo No. 345, Suka Asih, Bojongloa Kaler",
    "Jl. Antapani Lama No. 56, Antapani Kidul",
    "Jl. Margacinta No. 89, Margasari, Buahbatu",
    "Jl. Sarijadi Raya No. 12, Sarijadi, Sukasari",
    "Jl. Ujung Berung Raya No. 22, Pasir Endah, Ujungberung"
];

const FIRST_NAMES = ["Asep", "Nisa", "Budi", "Ratna", "Dimas", "Rizky", "Risa", "Dadan", "Siti", "Putri", "Aditya", "Fajar", "Irfan", "Rina", "Cici", "Dina", "Hendra", "Gilang", "Vina", "Bagas", "Ilham", "Intan", "Nia", "Tari", "Kiki", "Rio", "Andi", "Fina", "Eka", "Maya", "Yudi", "Iwan", "Siska", "Rani", "Fadli", "Iqbal", "Beni", "Doni", "Anton", "Maman"];
const LAST_NAMES = ["Santoso", "Wijaya", "Kusuma", "Lestari", "Nugroho", "Saputra", "Pratama", "Hidayat", "Setiawan", "Maulana", "Sari", "Rahayu", "Putra", "Pratiwi", "Gunawan", "Wibowo", "Kurniawan", "Suryana", "Permana", "Mulyana", "Fauzi"];

function getRandomName() {
    return FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)] + " " + LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
}

// Helper: Random Date Generator within last 30 days
function getRandomDateLast30Days() {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * 30);
    const hoursAgo = Math.floor(Math.random() * 24);
    const minutesAgo = Math.floor(Math.random() * 60);
    return new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000) - (hoursAgo * 60 * 60 * 1000) - (minutesAgo * 60 * 1000));
}

function formatDateToIndonesian(date) {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()} jam ${String(date.getHours()).padStart(2, '0')}.${String(date.getMinutes()).padStart(2, '0')} WIB`;
}

// Conversation styles randomly injected
const GREETINGS = ["halo min", "p", "hai kak", "assalamualaikum", "min mau pesen dong", "siang kak", "halo jalé florist", "punten min"];
const ASK_PRICES = ["kalo buket yg harganya {PRICE} ada?", "rekomendasi bunga {PRICE} dong", "mau cari yg {PRICE} ada ngga?", "ada buket {PRICE}?", "minta pricelist yg {PRICE} kak"];
const YES_I_WANT = ["oke mau yg itu", "yg ini aja min 1", "boleh deh yg ini", "aku pesen ini ya 1", "iya fix yg ini", "ini ready kan? mau 1"];
const ADDRESS_TYPOS = ["almt", "alamatnya di", "kirim ke", "krm ke", "almat"];
const WAIT_REPLIES = ["bentar mikir dlu ya", "tanya pacar dl ntar kabarin", "kemahalan min gajadi", "nanti deh kak makasih", "skip dl deh makasih infonya"];

async function runSeeder() {
    console.log("🌸 Memulai Generasi Data Organik...");

    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'jale_florist_ta'
    });

    const [products] = await connection.query('SELECT sku, name, price, image_url FROM products WHERE available = 1');
    if (products.length === 0) return;

    let generatedCount = 0;

    const generateSequence = async (type, no_wa, custName, baseDate) => {
        const p1 = products[Math.floor(Math.random() * products.length)];
        const p2 = products[Math.floor(Math.random() * products.length)];
        const addressStr = FULL_ADDRESSES[Math.floor(Math.random() * FULL_ADDRESSES.length)];
        const deliveryDate = new Date(baseDate.getTime() + (Math.floor(Math.random() * 3) + 1) * 86400000); 

        const ts = [15, 14, 10, 9, 5, 4, 3, 2, 1].map(m => new Date(baseDate.getTime() - m * 60000));
        let messages = [];
        let order = null;

        // Randomize linguistic choices
        const greet = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
        const ask = ASK_PRICES[Math.floor(Math.random() * ASK_PRICES.length)].replace('{PRICE}', (p1.price/1000) + 'k');
        const accept = YES_I_WANT[Math.floor(Math.random() * YES_I_WANT.length)];
        const decline = WAIT_REPLIES[Math.floor(Math.random() * WAIT_REPLIES.length)];
        // Load sandbox scenarios
        const sandboxScenarios = JSON.parse(fs.readFileSync('sandbox_scenarios.json', 'utf8'));

        if (type === 'WINDOW_SHOPPER') {
            // Pick a random scenario from the 52 handcrafted scenarios
            const randScenario = sandboxScenarios[Math.floor(Math.random() * sandboxScenarios.length)];
            
            // Map the messages and replace names
            let currentTs = new Date(baseDate.getTime() - (randScenario.messages.length * 60000));
            messages = randScenario.messages.map(m => {
                currentTs = new Date(currentTs.getTime() + (Math.floor(Math.random() * 2) + 1) * 60000);
                
                // Ganti nama-nama statis di skenario asli menjadi nama dinamis customer ini
                let txt = m.message_text;
                txt = txt.replace(/Refa|Yasir|Nisa|Bagas|Ilham|Dina|Anton|Rizky|Fadli/gi, custName.split(' ')[0]);
                
                return {
                    s: m.sender,
                    m: txt,
                    t: new Date(currentTs)
                };
            });
        } else if (type === 'PICKUP') {
            messages = [
                { s: 'customer', m: `${greet}, mau pesen ${p1.name} 1 bisa di ambil?`, t: ts[0] },
                { s: 'ai', m: `Tentu bisa Kak! Pesanan 1 ${p1.name} harganya Rp ${p1.price.toLocaleString('id-ID')} 🌸\nSilakan lengkapi:\nNama penerima : \nNo hp penerima : \nJenis order : \nJumlah order : \nDiantar / Diambil : \nHari dan Waktu pengantaran : \nUcapan : \nNotes / Request :`, t: ts[1] },
                { s: 'customer', m: `Nama : ${custName}\nNo hp : ${no_wa.split('_')[0]}\nJenis order : ${p1.sku}\nJumlah : 1\nDiantar / Diambil : Diambil ke toko\nHari/waktu : ${formatDateToIndonesian(deliveryDate)}\nUcapan : -\nNotes : yg rapih ya`, t: ts[2] },
                { s: 'ai', m: `Baik, totalnya Rp ${p1.price.toLocaleString('id-ID')}. Silakan scan QRIS berikut untuk DP minimal 50% ya Kak 😊`, t: ts[3] },
                { s: 'customer', m: `[Mengirimkan Foto] dah transfer min`, t: ts[4] },
                { s: 'ai', m: `[ESCALATION][HANDOFF] Alasan: Pelanggan mengirimkan bukti transfer yang perlu diverifikasi admin. | Draft: Terima kasih Kak ${custName}, bukti pembayarannya sudah kami terima dan akan segera diverifikasi oleh tim admin ya 🙏`, t: ts[5] },
                { s: 'admin', m: `Halo Kak, pembayaran sudah masuk. Pesanan akan siap diambil pada ${formatDateToIndonesian(deliveryDate)} 🌸`, t: ts[6] }
            ];
            order = {
                no_wa: no_wa, customer_name: custName, product: p1.name, delivery_date: formatDateToIndonesian(deliveryDate),
                address: "Diambil ke toko", status: Math.random() > 0.5 ? "Selesai" : "Diproses",
                biteship_order_id: "PICKUP-" + Date.now().toString().slice(-6), resi: "PICKUP", created_at: baseDate
            };
        } else if (type === 'DELIVERY') {
            const isMultiple = Math.random() > 0.6;
            const finalProduct = isMultiple ? `${p1.name} x1, ${p2.name} x1` : `${p1.name} x1`;
            const finalPrice = isMultiple ? p1.price + p2.price : p1.price;
            
            messages = [
                { s: 'customer', m: `${greet}. ${ask}`, t: ts[0] },
                { s: 'ai', m: `Tersedia Kak! Rekomendasinya: ${finalProduct} harganya Rp ${finalPrice.toLocaleString('id-ID')}.`, t: ts[1] },
                { s: 'customer', m: `${accept}. ${almtStr} ${addressStr}`, t: ts[2] },
                { s: 'ai', m: `Baik Kak ${custName}, pesanan ${finalProduct} dicatat! 🌸\nSilakan lengkapi:\nNama penerima : \nNo hp penerima : \nJenis order : \nJumlah order : \nDiantar / Diambil : \nAlamat Lengkap :\nHari dan Waktu pengantaran : \nUcapan : \nNotes / Request :`, t: ts[3] },
                { s: 'customer', m: `Nama penerima : ${custName}\nNo hp penerima : ${no_wa.split('_')[0]}\nJenis order : ${finalProduct}\nJumlah order : 1\nDiantar / Diambil : Diantar\nAlamat Lengkap : ${addressStr}\nHari dan Waktu pengantaran : ${formatDateToIndonesian(deliveryDate)}\nUcapan : Semangat kerjanya\nNotes / Request : -`, t: ts[4] },
                { s: 'ai', m: `Terima kasih! Totalnya Rp ${finalPrice.toLocaleString('id-ID')} + Ongkir. Pembayaran DP minimal 50% via QRIS ya Kak 😊`, t: ts[5] },
                { s: 'customer', m: `[Mengirimkan Foto] lunas ya`, t: ts[6] },
                { s: 'ai', m: `[ESCALATION][HANDOFF] Alasan: Pelanggan mengirimkan bukti transfer yang perlu diverifikasi admin.`, t: ts[7] },
            ];

            let biteshipRes = { id: `WYB-${Date.now()}${Math.floor(Math.random()*100)}`, waybill_id: `WYB-MOCK-${Date.now()}` };
            try {
                let dstLat = -6.9180, dstLon = 107.6090, dstPostal = 40111;
                const dMatch = BANDUNG_DISTRICTS.find(d => addressStr.toLowerCase().includes(d.name.toLowerCase()));
                if(dMatch) { dstLat = dMatch.lat; dstLon = dMatch.lon; dstPostal = dMatch.postal; }
                const bsReq = await fetch('https://api.biteship.com/v1/orders', {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${BITESHIP_TEST_KEY}`, 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        origin_contact_name: "Jalé Florist", origin_contact_phone: "0895402765380",
                        origin_address: "Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung",
                        origin_coordinate: { latitude: -6.9182, longitude: 107.6533 }, origin_postal_code: 40291,
                        destination_contact_name: custName, destination_contact_phone: no_wa.split('_')[0],
                        destination_address: addressStr, destination_postal_code: dstPostal,
                        destination_coordinate: { latitude: dstLat, longitude: dstLon },
                        couriers: "gojek", items: [{ name: finalProduct.substring(0,49), value: finalPrice, quantity: 1, weight: 1000 }]
                    })
                });
                const bsData = await bsReq.json();
                if(bsData && bsData.id) biteshipRes = bsData;
            } catch(e) {}

            messages.push({
                s: 'admin',
                m: `Halo Kak! Pesanan sudah dijadwalkan ya 🚚💨\n\n*DETAIL PENGIRIMAN*\n📦 Ekspedisi: GOJEK INSTANT\n🧾 No Resi: ${biteshipRes.id}\n📅 Waktu Pick-up: ${formatDateToIndonesian(deliveryDate)}\n\n*TUJUAN PENGIRIMAN*\n👤 Penerima: ${custName}\n📍 Alamat: ${addressStr}\n\nLacak status pesanan: 👉 https://track.biteship.com/${biteshipRes.id}?environment=development`,
                t: ts[8]
            });

            order = {
                no_wa: no_wa, customer_name: custName, product: finalProduct, delivery_date: formatDateToIndonesian(deliveryDate),
                address: addressStr, status: Math.random() > 0.4 ? "Selesai" : "Diproses",
                biteship_order_id: biteshipRes.id, resi: biteshipRes.waybill_id || "MENUNGGU_KURIR", created_at: baseDate
            };
        }

        await connection.query(`INSERT INTO contacts (no_wa, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = ?`, [no_wa, custName, custName]);
        for (const msg of messages) {
            await connection.query(`INSERT INTO messages (no_wa, sender, message_text, created_at) VALUES (?, ?, ?, ?)`, [no_wa, msg.s, msg.m, msg.t]);
        }
        if (order) {
            await connection.query(`INSERT INTO orders (no_wa, customer_name, product, delivery_date, address, status, biteship_order_id, resi, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, [order.no_wa, order.customer_name, order.product, order.delivery_date, order.address, order.status, order.biteship_order_id, order.resi, order.created_at]);
        }

        generatedCount++;
        process.stdout.write(`\rGenerating Varied Organics... ${generatedCount}/150`);
    };

    // Run Generator with dynamic human names (No Numbers!)
    for(let i = 0; i < 75; i++) {
        await generateSequence('WINDOW_SHOPPER', `08${Math.floor(100000000 + Math.random() * 900000000)}_DUMMY`, getRandomName(), getRandomDateLast30Days());
    }

    console.log(`\n\n✅ Selesai! Data dummy baru berhasil dibuat dengan gaya bahasa dan nama yang otentik!`);
    await connection.end();
}

runSeeder().catch(console.error);
