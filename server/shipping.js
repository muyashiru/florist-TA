// File: server/shipping.js
// Modul Integrasi API Pengiriman (Biteship Sandbox & Local Simulation untuk Gojek + Grab)

// API Key Biteship Sandbox (Silakan diganti dengan API Key dari biteship.com jika sudah mendaftar)
// API Key Biteship Sandbox/Live dari biteship.com
export const BITESHIP_API_KEY = 'biteship_live.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1lIjoiSmFsZUZsb3Jpc3QiLCJ1c2VySWQiOiI2YTY3YTJhODliN2QyZjc1MjJlZGE5ZDYiLCJpYXQiOjE3ODUxNzgwMTh9.eWt50ICzQ1UdyKeTiy_K0aYbuj29D9p1QdBJL_gCma8'; 

// Koordinat & Kode Pos Toko Jalé Florist (Antapani Kidul, Bandung)
const ORIGIN = {
    name: 'Jalé Florist (Antapani Kidul)',
    postal_code: 40291,
    latitude: -6.91266,
    longitude: 107.66224
};

// Database Koordinat & Estimasi Jarak Kecamatan di Bandung Raya (untuk mapping cepat)
const BANDUNG_DISTRICTS = [
    { name: 'Antapani', km: 2, postal: 40291, lat: -6.9150, lon: 107.6580 },
    { name: 'Arcamanik', km: 3, postal: 40293, lat: -6.9180, lon: 107.6720 },
    { name: 'Kiaracondong', km: 4, postal: 40283, lat: -6.9250, lon: 107.6450 },
    { name: 'Buahbatu', km: 7, postal: 40286, lat: -6.9500, lon: 107.6330 },
    { name: 'Batununggal', km: 6, postal: 40266, lat: -6.9400, lon: 107.6300 },
    { name: 'Cicaheum', km: 3.5, postal: 40195, lat: -6.9020, lon: 107.6550 },
    { name: 'Dago', km: 8, postal: 40135, lat: -6.8850, lon: 107.6140 },
    { name: 'Dipatiukur', km: 7.5, postal: 40132, lat: -6.8900, lon: 107.6150 },
    { name: 'Setiabudi', km: 10, postal: 40143, lat: -6.8650, lon: 107.5950 },
    { name: 'Sukajadi', km: 9, postal: 40162, lat: -6.8850, lon: 107.5950 },
    { name: 'Pasteur', km: 10, postal: 40161, lat: -6.8950, lon: 107.5850 },
    { name: 'Braga', km: 7, postal: 40111, lat: -6.9180, lon: 107.6090 },
    { name: 'Bandung Kota', km: 7, postal: 40111, lat: -6.9180, lon: 107.6090 },
    { name: 'Cibiru', km: 8, postal: 40614, lat: -6.9300, lon: 107.7150 },
    { name: 'Ujungberung', km: 6, postal: 40611, lat: -6.9150, lon: 107.6950 },
    { name: 'Bojongsoang', km: 11, postal: 40288, lat: -6.9800, lon: 107.6350 },
    { name: 'Dayeuhkolot', km: 12, postal: 40258, lat: -6.9850, lon: 107.6250 },
    { name: 'Cimahi', km: 16, postal: 40512, lat: -6.8730, lon: 107.5420 },
    { name: 'Padalarang', km: 22, postal: 40553, lat: -6.8400, lon: 107.4750 },
    { name: 'Jatinangor', km: 18, postal: 45363, lat: -6.9300, lon: 107.7750 }
];

export async function checkShippingRates(userMessage) {
    // 1. Cek apakah pesan berhubungan dengan ongkir, kirim, kurir, gojek, grab, lalamove, atau menyebut daerah di Bandung
    const msgLower = userMessage.toLowerCase();
    const isShippingQuery = /ongkir|kirim|kurir|gojek|grab|lalamove|biaya pengiriman|ongkos|tarif/i.test(msgLower);
    
    // Cari daerah tujuan yang disebut di dalam pesan
    const targetDistrict = BANDUNG_DISTRICTS.find(d => msgLower.includes(d.name.toLowerCase()));

    if (!isShippingQuery && !targetDistrict) {
        return null; // Bukan pertanyaan yang membutuhkan cek ongkir
    }

    const destinationName = targetDistrict ? targetDistrict.name : 'Bandung Raya (Area Umum)';
    const distanceKm = targetDistrict ? targetDistrict.km : 6;
    const destPostal = targetDistrict ? targetDistrict.postal : 40111;

    console.log(`📦 [Shipping API] Pengecekan ongkir untuk tujuan: [${destinationName}] (~${distanceKm} km)...`);

    // 2. Jika API Key Biteship sudah diisi oleh User, coba panggil API Asli Biteship!
    if (BITESHIP_API_KEY && BITESHIP_API_KEY.trim() !== '') {
        try {
            console.log(`🌐 [Biteship API] Memanggil server asli Biteship...`);
            const response = await fetch('https://api.biteship.com/v1/rates/couriers', {
                method: 'POST',
                headers: {
                    'authorization': `Bearer ${BITESHIP_API_KEY.trim()}`,
                    'content-type': 'application/json'
                },
                body: JSON.stringify({
                    origin_postal_code: ORIGIN.postal_code,
                    origin_latitude: ORIGIN.latitude,
                    origin_longitude: ORIGIN.longitude,
                    destination_postal_code: destPostal,
                    destination_latitude: targetDistrict?.lat || -6.9180,
                    destination_longitude: targetDistrict?.lon || 107.6090,
                    couriers: 'gojek,grab',
                    items: [{ name: 'Bouquet Bunga', value: 250000, weight: 1000 }]
                })
            });

            const data = await response.json();
            if (data.success && data.pricing && data.pricing.length > 0) {
                let ratesText = `\n--- DATA ESTIMASI ONGKIR (BITESHIP API ASLI) ---\n`;
                ratesText += `Tujuan Terdeteksi: ${destinationName} (Kode Pos: ${destPostal})\n`;
                data.pricing.forEach((item, idx) => {
                    ratesText += `${idx + 1}. ${item.company.toUpperCase()} (${item.type}): Rp ${item.price.toLocaleString('id-ID')} (Estimasi tiba: ${item.duration})\n`;
                });
                ratesText += `--------------------------------------------------\n`;
                return ratesText;
            }
        } catch (err) {
            console.error('⚠️ [Biteship API Error] Gagal memanggil Biteship, beralih ke estimasi simulasi:', err.message);
        }
    }

    // 3. Fallback / Sandbox Simulation Mode (Tarif Standar GoSend & GrabExpress Bandung Raya)
    // Rumus tarif: Gojek Sameday Rp 15.000 + (Rp 2.000 x km), Instant Rp 20.000 + (Rp 3.000 x km)
    const gojekSameday = Math.max(15000, Math.round((12000 + (distanceKm * 2000)) / 1000) * 1000);
    const gojekInstant = Math.max(20000, Math.round((15000 + (distanceKm * 3000)) / 1000) * 1000);
    const grabInstant = Math.max(22000, Math.round((16000 + (distanceKm * 3200)) / 1000) * 1000);

    let ratesText = `\n--- DATA ESTIMASI ONGKIR (SANDBOX COURIER API: GOJEK & GRAB) ---\n`;
    ratesText += `Tujuan Terdeteksi: ${destinationName} (Jarak dari Toko Antapani: ~${distanceKm} km)\n`;
    ratesText += `1. Gojek (GoSend Sameday): Rp ${gojekSameday.toLocaleString('id-ID')} (Estimasi tiba 3-6 jam)\n`;
    ratesText += `2. Gojek (GoSend Instant): Rp ${gojekInstant.toLocaleString('id-ID')} (Estimasi tiba 1-2 jam)\n`;
    ratesText += `3. Grab (GrabExpress Instant): Rp ${grabInstant.toLocaleString('id-ID')} (Estimasi tiba 1-2 jam)\n`;
    ratesText += `Catatan: Ini adalah estimasi tarif ongkir. Harga ongkir pasti akan dikonfirmasi oleh Admin saat pemesanan.\n`;
    ratesText += `------------------------------------------------------------------\n`;

    return ratesText;
}
