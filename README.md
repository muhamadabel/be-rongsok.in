# Backend Rongsok.in 🔄

Backend server untuk platform Rongsok.in—marketplace daur ulang sirkular berbasis geolokasi yang menghubungkan pelanggan (Customer) dengan pengepul sampah terdekat (Collector) secara real-time.

## 🚀 Fitur Utama
- **Smart Search**: Pencarian pengepul terdekat menggunakan PostgreSQL + PostGIS (query spasial `ST_DWithin` & `ST_Distance`).
- **Real-time OMS**: Manajemen pesanan real-time menggunakan WebSockets (Socket.IO).
- **Nota Digital**: Penerbitan struk transaksi (receipt) setelah order selesai.
- **Rating Dua Arah**: Sistem reputasi tepercaya untuk pelanggan dan pengepul.

## 🏗️ Tech Stack
- **Runtime & Framework**: Node.js & Express.js
- **Database & ORM**: PostgreSQL (PostGIS) & Prisma ORM
- **Real-time Engine**: Socket.IO
- **Keamanan & Otorisasi**: JWT & bcrypt
- **Penyimpanan Gambar**: Cloudinary API
- **Deployment**: Docker & CapRover PaaS (Home Lab Server) dengan Cloudflare Tunnel

## 🛠️ Quick Start

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Environment (`.env`)
Salin berkas `.env.example` menjadi `.env` dan lengkapi nilainya:
```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public
PORT=3000
JWT_SECRET=your-super-secret-key

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 3. Migrasi Database & Menjalankan Server
```bash
# Sinkronkan skema database (pastikan ekstensi PostGIS aktif)
npx prisma migrate dev

# Jalankan server dalam mode development
npm run dev
```

Server backend akan aktif di `http://localhost:3000`.

---
*Developed for OLIVIA Competition @ Yogyakarta* ♻️
