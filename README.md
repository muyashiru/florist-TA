<div align="center">

# 🌸 Jalé Florist — Sistem Cerdas E-Commerce & AI Chatbot Terintegrasi

**Bloom with meaning, delivered with love.**

Proyek Tugas Akhir ini merupakan sistem informasi e-commerce komprehensif untuk **Jalé Florist**, sebuah toko bunga di Bandung. Sistem ini mengintegrasikan katalog frontend interaktif dengan backend cerdas yang ditenagai oleh **DeepSeek AI**, WhatsApp Gateway (**Baileys**), dan API Logistik (**Biteship**), serta dilengkapi dengan Dashboard Admin untuk pemantauan Real-time.

![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5+-646CFF?style=flat-square&logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Database-4479A1?style=flat-square&logo=mysql&logoColor=white)

</div>

---

## 📖 Deskripsi Proyek (Tugas Akhir)

Sistem ini dirancang untuk mendigitalisasi dan mengotomatisasi proses bisnis penjualan bunga di Jalé Florist. Pelanggan dapat berbelanja melalui website katalog, maupun langsung menghubungi WhatsApp toko. Pesan WhatsApp yang masuk akan ditangani secara otomatis oleh **AI Assistant (DeepSeek)** yang mampu merekomendasikan produk, menerima pesanan, dan mengkalkulasi ongkos kirim secara presisi menggunakan **Biteship API**.

Jika AI tidak dapat menangani permintaan khusus (misal: komplain, pertanyaan di luar konteks, atau permintaan khusus pelanggan), AI akan secara otomatis menonaktifkan dirinya dan melakukan *Handoff* ke Admin Manusia melalui sistem peringatan di **Admin Dashboard**.

---

## ✨ Fitur Utama

### 💻 1. Frontend Web Catalog (React + Vite)
- **Katalog Produk Dinamis**: Menampilkan koleksi bunga dengan filter kategori dan ukuran.
- **Quick View Modal**: Detail produk tanpa perlu berpindah halaman, lengkap dengan kalkulasi total harga & *add-on* bunga ekstra.
- **Smart WhatsApp Generator**: Mempermudah pemesanan dengan men-generate pesan otomatis ke WA toko.
- **Desain Modern & Responsif**: Menggunakan Tailwind CSS dengan estetik warna khusus toko (*Cream, Blush, Sand, Rose*).

### 🧠 2. AI Chatbot (DeepSeek AI)
- **Natural Language Processing**: Merespons pelanggan dengan gaya bahasa kasual, ramah, dan solutif layaknya admin manusia.
- **Order Management**: AI otomatis mengekstrak pesanan dari obrolan pelanggan (Nama produk, SKU, tanggal kirim, alamat lengkap).
- **Auto-Handoff (Escalation)**: Jika percakapan butuh campur tangan manusia (misalnya: *komplain order lama*, *chat berbelit-belit*), AI mematikan dirinya secara otomatis (`is_ai_active = 0`) dan mengaktifkan peringatan *Need Help* untuk Admin.

### 🚚 3. Logistik Terintegrasi (Biteship API)
- **Cek Ongkir Otomatis**: AI memvalidasi alamat pelanggan dengan lokasi toko di Antapani, Bandung dan menghitung ongkos kirim seketika.
- **Generate Resi (Waybill)**: Otomatis membuat order pengiriman (Kurir Instan/Same-day) ketika pelanggan setuju dan melampirkan bukti transfer.

### 📱 4. WhatsApp Gateway (Baileys)
- Terhubung langsung ke API WhatsApp Web secara independen (Multi-device).
- Mendukung dua mode: **Mode Live** (menggunakan WhatsApp asli) dan **Mode Sandbox** (simulator chat web untuk testing yang aman tanpa scan QR).

### 🎛️ 5. Admin Command Center (Dashboard)
- **Live Chat Monitor**: Memantau ratusan percakapan antara AI dan pelanggan secara real-time.
- **Manajemen Handoff**: Admin dapat mengambil alih percakapan (Human Mode) yang tertunda dan membalas langsung dari sistem.
- **Antrean Produksi**: Memisahkan dan mengelola daftar pesanan *Pickup* dan *Delivery*, mencetak ID Order Biteship dan Resi Kurir.
- **Data & Performa**: Dashboard analitik yang menampilkan visualisasi tren jam sibuk, total percakapan, produk terpopuler, dan efisiensi kesuksesan AI secara otomatis.
- **AI Copilot**: Asisten AI internal untuk Admin yang bisa digunakan merangkum sentimen seluruh obrolan pelanggan hari ini.

---

## 🛠️ Tech Stack

| Komponen | Teknologi | Keterangan |
|----------|-----------|------------|
| **Frontend** | React 18, Vite, Tailwind CSS | UI Catalog & Dashboard Admin |
| **Backend** | Node.js, Express.js | Server utama, REST API endpoints |
| **Database** | MySQL (mysql2) | Penyimpanan chat history, kontak, order |
| **WhatsApp** | `@whiskeysockets/baileys` | Web-socket koneksi ke server WhatsApp |
| **AI Engine** | DeepSeek AI | Otak chatbot pelanggan & Copilot admin |
| **Logistik** | Biteship API | API Kurir Instan (Gojek/Grab) & Cek Ongkir |

---

## 🗄️ Skema Database (MySQL)

Database utama bernama `jale_florist_ta`, terdiri dari tabel:
1. **`contacts`**: Menyimpan nomor unik pelanggan, nama, dan status `is_ai_active` (1 = AI, 0 = Admin).
2. **`messages`**: Menyimpan seluruh riwayat obrolan (Timestamp, Sender: 'ai' / 'customer' / 'admin').
3. **`orders`**: Menyimpan data transaksi final (ID, Nama, Produk, Alamat, Tanggal Kirim, Status Order, `biteship_order_id`, `resi`).

---

## 📁 Struktur Folder Proyek

```text
florist - TA/
├── src/                      # (FRONTEND: KODE REACT)
│   ├── components/           # Komponen UI (Navbar, QuickView, Dashboard Sidebar)
│   ├── pages/                # Halaman Web (Dashboard Inbox, Overview, Sandbox, Catalog)
│   ├── data/                 # Database frontend statis (Produk, Testimonial)
│   └── utils/                # Helper functions
├── server/                   # (BACKEND: KODE NODE.JS)
│   ├── index.js              # Entry point Express, koneksi DB, Endpoints Dashboard
│   ├── wa.js                 # Inti logika Baileys & DeepSeek AI (System Prompt, Handoff)
│   └── shipping.js           # Pengaturan endpoint API pengiriman (Biteship)
├── scripts/                  # (GENERATOR DATA)
│   └── seed_dummy_data.cjs   # Generator 150+ data organik (komplain, order, tanya alamat)
├── sandbox_scenarios.json    # Berisi 52 skenario arsitektur chat unik untuk testing sistem
├── package.json              # Daftar dependencies Node.js
└── tailwind.config.js        # Konfigurasi gaya CSS
```

---

## 🚀 Panduan Menjalankan Proyek

### 1. Prasyarat
- **Node.js** v18 atau lebih baru.
- **MySQL Server** (XAMPP / Laragon dsb) berjalan di localhost port `3306`.
- API Key aktif untuk DeepSeek AI dan Biteship.

### 2. Konfigurasi Database
Buat database bernama `jale_florist_ta` di MySQL Anda. 
Sistem *backend* Node.js dirancang untuk **secara otomatis** membuat tabel-tabel (`contacts`, `messages`, `orders`) saat pertama kali server dijalankan.

### 3. Instalasi Dependensi
```bash
# Clone proyek, kemudian install package
npm install
```

### 4. Menjalankan Server & Web
Sistem ini menggunakan dua terminal terpisah.

**Terminal 1 (Jalankan Backend Node.js):**
```bash
node server/index.js
```
*(Setelah jalan, Anda akan diminta memilih Mode: Tekan `[1]` untuk Sandbox atau `[2]` untuk Live WA Baileys)*

**Terminal 2 (Jalankan Frontend Vite):**
```bash
npm run dev
```
Akses aplikasi melalui browser di URL: `http://localhost:5173`

### 5. Generate Data Simulasi (Opsional - Untuk Sidang)
Jika database Anda masih kosong dan Anda ingin mengisi *Dashboard Admin* dengan ratusan data percakapan yang organik (lengkap dengan pesanan kurir, komplain pengiriman, dll), jalankan perintah:
```bash
node scripts/seed_dummy_data.cjs
node fix_escalations.cjs
```
Refresh dashboard Anda, dan seluruh data statistik serta daftar pesanan antrean produksi akan otomatis terisi dan siap didemonstrasikan.

---

## 🧪 Mode Sandbox vs Live WA

- **Mode Sandbox**: Mode virtual tertutup yang disiapkan khusus untuk **demonstrasi Tugas Akhir**. Di mode ini, Chatbot akan berkomunikasi melalui antarmuka web khusus di `http://localhost:5173/sandbox` menggunakan API lokal tanpa perlu terhubung ke Meta / scan QR Code. Sangat berguna untuk pengujian algoritma secara masif tanpa takut terkena *spam-ban*.
- **Mode Live WA**: Mode riil dimana sistem `wa.js` men-generate QR Code WhatsApp untuk di-scan. Segera setelah di-scan, AI akan membalas semua pesan WhatsApp pelanggan yang masuk secara *real-time*.

---

<div align="center">
Dibuat sebagai <b>Proyek Tugas Akhir</b>.<br>
<i>Handle with care, happiness inside.</i>
</div>
