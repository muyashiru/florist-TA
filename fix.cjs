const fs = require('fs');
let content = fs.readFileSync('server/index.js', 'utf8');

const regex = /const response = await fetch\('https:\/\/api\.biteship\.com\/v1\/orders'[\s\S]*?if \(\!trackingUrl\.includes\('environment='\)\) \{\s*trackingUrl \+= '\?environment=development';\s*\}/;

const newBlock = `const isPickup = destAddress.toLowerCase().includes('ambil') || destAddress.toLowerCase().includes('cicalengka') || destAddress.toLowerCase().includes('pick');
        
        let data = {};
        let resi = '';
        let trackingUrl = '';
        
        if (!isPickup) {
            const response = await fetch('https://api.biteship.com/v1/orders', {
                method: 'POST',
                headers: {
                    'Authorization': \\\`Bearer \${BITESHIP_TEST_KEY}\\\`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payloadOrder)
            });

            data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || data.message || 'Gagal memanggil Biteship API');
            }

            resi = data.courier && data.courier.waybill_id ? data.courier.waybill_id : (data.id || 'GOJ-TEST-123');
            const trackingId = data.courier && data.courier.tracking_id ? data.courier.tracking_id : data.id;
            trackingUrl = data.courier && data.courier.link ? data.courier.link : \\\`https://track.biteship.com/\${trackingId}\\\`;
            
            if (!trackingUrl.includes('environment=')) {
                trackingUrl += '?environment=development';
            }
        } else {
            data = { id: 'PICKUP-' + Date.now(), destination: { contact_name: payloadOrder.destination_contact_name, address: payloadOrder.destination_address } };
        }`;

content = content.replace(regex, newBlock);

content = content.replace(
    'const finalDestName = data.destination ? data.destination.contact_name : payloadOrder.destination_contact_name;\r\n        const finalDestAddress = data.destination ? data.destination.address : payloadOrder.destination_address;',
    'const finalDestName = payloadOrder.destination_contact_name;\r\n        const finalDestAddress = payloadOrder.destination_address;'
);
content = content.replace(
    'const finalDestName = data.destination ? data.destination.contact_name : payloadOrder.destination_contact_name;\n        const finalDestAddress = data.destination ? data.destination.address : payloadOrder.destination_address;',
    'const finalDestName = payloadOrder.destination_contact_name;\n        const finalDestAddress = payloadOrder.destination_address;'
);

const msgTextRegex = /let msgText = '';\s*if \(parsedDeliveryType === 'later'\) \{[\s\S]*?Ditunggu kedatangan bunganya ya 🌸\`;\s*\}/;

const newMsgText = `let msgText = '';
        if (isPickup) {
            msgText = \\\`Halo Kak! Pesanan Kakak sudah kami siapkan dan bisa diambil di toko sesuai jadwal ya 🌸✨

*DETAIL PENGAMBILAN (PICK-UP)*
📅 Jadwal Ambil: \${dateStr}
📍 Lokasi Toko: Jl. Cicalengka Raya No.8, Antapani Kidul, Kota Bandung (08.30 - 18.30 WIB)

*RINCIAN PESANAN*
👤 Pemesan: \${finalDestName}
🛍️ Produk: 1x \${itemName}

Ditunggu kedatangannya di Jalé Florist ya Kak! Hati-hati di jalan 🌸\\\`;
        } else if (parsedDeliveryType === 'later') {
            msgText = \\\`Halo Kak! Pesanan Kakak sudah dijadwalkan untuk pengiriman ya 🚚💨

*DETAIL PENGIRIMAN*
📦 Ekspedisi: \${courierName}
📅 Waktu Pick-up: \${dateStr}

*TUJUAN PENGIRIMAN*
👤 Penerima: \${finalDestName}
📞 No. HP: \${payloadOrder.destination_contact_phone}
📍 Alamat: \${finalDestAddress}

*RINCIAN PESANAN*
🛍️ Produk: 1x \${itemName}

Lacak status pesanan Kakak di sini:
👉 \${trackingUrl}

*(Catatan: Karena ini pesanan terjadwal, halaman pelacakan mungkin baru akan aktif atau memunculkan nama kurir pada hari H pengiriman ya, Kak!)*

Terima kasih sudah berbelanja di Jalé Florist! Ditunggu kedatangan bunganya ya 🌸\\\`;
        } else {
            msgText = \\\`Halo Kak! Pesanan Kakak sudah diserahkan ke kurir ya 🚚💨

*DETAIL PENGIRIMAN*
📦 Ekspedisi: \${courierName}
🧾 No Resi: \${resi}
📅 Waktu Pick-up: \${dateStr}

*TUJUAN PENGIRIMAN*
👤 Penerima: \${finalDestName}
📞 No. HP: \${payloadOrder.destination_contact_phone}
📍 Alamat: \${finalDestAddress}

*RINCIAN PESANAN*
🛍️ Produk: 1x \${itemName}

Lacak pengiriman Kakak secara *real-time* di sini:
👉 \${trackingUrl}

Terima kasih sudah berbelanja di Jalé Florist! Ditunggu kedatangan bunganya ya 🌸\\\`;
        }`;

content = content.replace(msgTextRegex, newMsgText);

fs.writeFileSync('server/index.js', content);
console.log('Success');
