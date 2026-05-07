# Deskripsi Web Panel — Platform Ekosistem Daur Ulang Sirkular Rongsok.in

> **Konteks Proyek:** Proyek kompetisi (Lomba OLIVIA) untuk memvalidasi pasar daur ulang di Yogyakarta. Fokus pada digitalisasi rantai distribusi sampah antara penghasil sampah (mahasiswa/kos) dan pengepul tradisional.

Web Panel ini berfungsi sebagai **Marketplace & Order Management System (OMS)** yang menghubungkan **Customer** dengan **Pengepul**. Sistem ini menghilangkan hambatan transaksi informal dengan menyediakan transparansi harga, lokasi pengepul terdekat (PostGIS), dan sistem rating dua arah.

Desain panel menggunakan pendekatan **"Clean Sky Blue"** — kombinasi palet ala Tokopedia dengan warna primer `#0EA5E9` (sky-500) untuk memberikan kesan modern, bersih, dan profesional bagi ekosistem daur ulang.

---

## Scope Utama Sistem (Core Domain)

**Geolocation-based Order Management** adalah inti dari sistem ini. Memastikan setiap permintaan penjemputan sampah (pick-up) atau pengantaran (drop-off) tercatat secara presisi, real-time, dan memiliki bukti digital (receipt).

---

## Modul-Modul Sistem

### 1. Dashboard & Smart Discovery
Pusat kontrol berbasis role (Customer/Pengepul) untuk memantau aktivitas transaksi.
- **Smart Search (PostGIS)**: Mencari pengepul berdasarkan radius terdekat dan kategori sampah (Kardus, Plastik, Besi, dll).
- **Statistik Cepat**: Total sampah yang didaur ulang (kg), total pendapatan (bagi customer), dan total pesanan masuk (bagi pengepul).
- **Map View (Leaflet.js)**: Visualisasi lokasi lapak/pengepul di sekitar pengguna secara interaktif.

### 2. Order Management System (OMS)
Fitur utama yang mengelola siklus hidup transaksi dari penjemputan hingga selesai.
- **Request Pick-up**: Customer mengunggah foto sampah, estimasi berat, dan lokasi jemput.
- **Real-time Alert (Socket.IO)**: Pengepul menerima notifikasi pesanan masuk secara instan.
- **Status State Machine**: Pelacakan status transparan mulai dari `PENDING`, `CONFIRMED`, `IN_PROGRESS`, `AWAITING_CONFIRMATION`, hingga `COMPLETED` atau `CANCELLED`.
- **Validation Form**: Input berat aktual dan harga final oleh pengepul untuk disetujui oleh customer.

### 3. Katalog & Harga Dinamis
Manajemen daftar harga beli sampah yang dikelola secara mandiri oleh Pengepul.
- **Master Kategori**: Pengepul memilih kategori dari master list (misal: Botol PET, Koran, Tembaga).
- **Price Range**: Pengaturan range harga per kg (Min-Max) untuk memberikan ekspektasi transparan kepada customer.
- **Status Buka/Tutup**: Toggle ketersediaan layanan pengepul secara real-time.

### 4. Digital Receipt & Riwayat
Sistem pencatatan otomatis untuk menggantikan nota kertas yang mudah hilang.
- **Auto-Generated Receipt**: Snapshot data final (berat, harga, tanggal) yang diterbitkan setelah transaksi `COMPLETED`.
- **Log Transaksi**: Riwayat lengkap bagi kedua belah pihak untuk melihat performa ekonomi dan lingkungan (volume sampah yang terselamatkan).

### 5. Mutual Rating System
Sistem pembangun kepercayaan (trust-building) di dalam ekosistem.
- **Rating Dua Arah**: Customer menilai kejujuran timbangan pengepul; Pengepul menilai kebersihan/akurasi deskripsi sampah customer.
- **Trust Score**: Akumulasi bintang yang tampil di profil untuk membantu pengguna memilih mitra terbaik.

### 6. Autentikasi & Onboarding
- **Role Selection**: Pemilihan peran permanen (Customer/Pengepul) saat registrasi.
- **Collector Profiling**: Form khusus pengepul untuk melengkapi data lapak, radius layanan, dan foto gudang.

---

## Aturan Pengembangan (Development Rules)

🚨 **WAJIB DIPATUHI**:

| Aturan | Deskripsi |
| :--- | :--- |
| **Tech Stack Consistency** | Wajib menggunakan **Full JavaScript** (Next.js, Express.js, Prisma ORM). Dilarang keras menggunakan PHP/Laravel. |
| **Styling Palette** | Gunakan sistem warna Sky Blue (Tailwind `sky` family). Hindari penggunaan warna merah/hijau kecuali untuk status sukses/error. |
| **PostGIS Priority** | Semua query lokasi harus melalui ekstensi PostGIS (`ST_DWithin`, `ST_Distance`) untuk akurasi radius. |
| **Stateless Frontend** | UI komponen harus menerima data via props atau custom hooks. Dilarang melakukan direct fetch API di dalam komponen UI. |
| **Strict MVP Limit** | Jangan kembangkan fitur Payment Gateway atau In-app Chat. Komunikasi antar user dialihkan ke WhatsApp eksternal. |

---

> **Note:** Fokus utama untuk submission OLIVIA adalah kelancaran flow transaksi dari pencarian hingga rating (End-to-End).