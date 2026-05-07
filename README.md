# BE Rongsok.in 🔄

**Backend Repository untuk Platform Ekosistem Daur Ulang Sirkular — Rongsok.in**

Platform marketplace yang menghubungkan penghasil sampah (Customer) dengan pengepul tradisional (Lapak/Gudang) melalui sistem geolocation-based order management.

## 📋 Overview

Rongsok.in adalah solusi digital untuk mengubah rantai distribusi sampah yang informal menjadi platform terstruktur, transparan, dan efisien. Backend repository ini mengelola semua logika bisnis inti termasuk:

- **Geolocation-based Discovery**: Pencarian pengepul terdekat menggunakan PostGIS
- **Real-time Order Management**: State machine pesanan dengan WebSocket notifications
- **Digital Receipt System**: Pencatatan transaksi otomatis
- **Mutual Rating System**: Trust-building mechanism dua arah
- **REST API**: Endpoint lengkap untuk integrasi frontend

**Submission:** Lomba OLIVIA | **Target Wilayah:** Yogyakarta

## 🏗️ Tech Stack

| Layer | Teknologi | Alasan |
|-------|-----------|--------|
| **Runtime** | Node.js | JavaScript full-stack consistency |
| **Framework** | Express.js | Lightweight, middleware-based, production-ready |
| **Database** | PostgreSQL + PostGIS | Relational + spatial queries untuk geolocation |
| **ORM** | Prisma | Type-safe, modern, excellent developer experience |
| **Real-time** | Socket.IO | WebSocket untuk notifikasi pesanan real-time |
| **Auth** | JWT + bcrypt | Stateless auth, secure password hashing |
| **Validation** | Zod | Schema validation, type inference |
| **Storage** | AWS S3 / Cloudinary | Cloud storage untuk foto sampah |
| **Deployment** | Railway / Render | PaaS untuk MVP scaling |

**Node version:** `>=18.0.0`

## 📂 Project Structure

```
.
├── src/
│   ├── config/              # Konfigurasi database, JWT, storage
│   ├── controllers/         # Logic handler untuk setiap endpoint
│   ├── middleware/          # Auth, validation, error handling
│   ├── models/              # Database queries (Prisma)
│   ├── routes/              # API route definitions
│   ├── services/            # Business logic (Order, Rating, etc)
│   ├── types/               # TypeScript interfaces
│   ├── utils/               # Helper functions (PostGIS, notifications)
│   └── app.ts               # Express app setup
├── prisma/
│   ├── schema.prisma        # Data model definitions
│   └── migrations/          # Database migration history
├── .env.example             # Environment variables template
├── package.json
└── README.md                # File ini
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0.0
- PostgreSQL >= 13 (dengan ekstensi PostGIS)
- npm atau pnpm

### Installation

1. **Clone repository:**
```bash
git clone https://github.com/yourusername/be-rongsok.in.git
cd be-rongsok.in
```

2. **Install dependencies:**
```bash
npm install
# atau
pnpm install
```

3. **Setup environment variables:**
```bash
cp .env.example .env
```

Edit `.env` dengan konfigurasi lokal Anda:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/rongsok_dev

# JWT
JWT_SECRET=your-super-secret-key-change-this

# Storage (Cloudinary atau S3)
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Socket.IO
SOCKET_IO_PORT=3001

# Node environment
NODE_ENV=development
```

4. **Setup database:**
```bash
# Pastikan ekstensi PostGIS aktif di PostgreSQL
psql -d rongsok_dev -c "CREATE EXTENSION postgis;"

# Jalankan migration
npm run db:migrate

# (Optional) Seed data untuk development
npm run db:seed
```

5. **Start server:**
```bash
npm run dev
```

Server berjalan di `http://localhost:3000`

## 📡 API Documentation

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication
Semua endpoint (kecuali `/auth/register` dan `/auth/login`) memerlukan Bearer token:
```
Authorization: Bearer <jwt_token>
```

### Core Endpoints

#### Auth Module
- `POST /auth/register` - Registrasi (pilih role: CUSTOMER/COLLECTOR)
- `POST /auth/login` - Login (return JWT)
- `GET /auth/me` - Get current user profile

#### Discovery Module
- `GET /discovery/search?lat=X&lng=Y&category=kardus&radius=5` - Cari pengepul terdekat (PostGIS)
- `GET /discovery/collectors/:id` - Detail profil pengepul

#### Order Management (OMS)
- `POST /orders` - Create order (Customer)
- `GET /orders` - List orders (paginated)
- `GET /orders/:id` - Order detail
- `PATCH /orders/:id/accept` - Accept order (Collector)
- `PATCH /orders/:id/reject` - Reject order (Collector)
- `PATCH /orders/:id/validate` - Submit weighting result (Collector)
- `PATCH /orders/:id/confirm` - Confirm price (Customer)

#### Rating Module
- `POST /ratings` - Submit rating (after order COMPLETED)
- `GET /ratings/user/:userId` - Get user's received ratings

#### Collector Profile
- `POST /collector/profile` - Setup lapak profile (after COLLECTOR registration)
- `PATCH /collector/profile` - Update profile
- `PATCH /collector/catalogs` - Update item prices

Dokumentasi lengkap: [API Docs](./docs/API.md) *(coming soon)*

## 🔄 Order State Machine

Status pesanan mengikuti flow berikut:

```
PENDING
  ↓
  ├─→ CONFIRMED (Collector accepts)
  │     ↓
  │     IN_PROGRESS
  │     ↓
  │     AWAITING_CONFIRMATION (Collector submits weight/price)
  │     ↓
  │     COMPLETED (Customer confirms price)
  │
  └─→ CANCELLED (15min timeout / all collectors reject)
```

**Real-time Updates:** Setiap status change di-broadcast via Socket.IO ke kedua pihak.

## 🌍 PostGIS Queries

Pencarian pengepul menggunakan spatial queries:

```sql
-- Cari pengepul dalam radius 5km dari lokasi customer
SELECT * FROM "CollectorProfile" cp
JOIN "User" u ON cp.userId = u.id
WHERE ST_DWithin(u.location, ST_GeographyFromText('POINT(x y)'), 5000)
ORDER BY ST_Distance(u.location, ST_GeographyFromText('POINT(x y)'))
LIMIT 20;
```

Pastikan spatial index sudah dibuat:
```sql
CREATE INDEX idx_user_location ON "User" USING GIST (location);
```

## 🔐 Security

- **Password Hashing:** bcrypt dengan salt rounds 10
- **JWT Expiry:** Access token valid 24 jam, refresh token 7 hari
- **Input Validation:** Zod schema di setiap endpoint
- **File Upload:** Validasi tipe (jpeg/png/webp) & ukuran max 5MB
- **Rate Limiting:** (Coming soon) Implementasi untuk prevent abuse
- **CORS:** Configured untuk frontend domain

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Coverage report
npm run test:coverage
```

## 📊 Database Schema Highlights

### Core Tables

| Table | Purpose |
|-------|---------|
| `users` | All users (Customer, Collector, Admin) dengan role-based access |
| `collector_profiles` | Extended profile untuk Collector (lapak name, radius, open status) |
| `orders` | Inti transaksi dengan state machine status |
| `order_collectors` | Broadcast mapping (pesanan ke multiple collector candidates) |
| `waste_categories` | Master data kategori sampah (Admin-managed) |
| `collector_catalogs` | Harga per kategori per collector |
| `ratings` | Mutual ratings dengan unique constraint (order_id + rater_id) |
| `receipts` | Digital receipt snapshot |

**Spatial Column:** `users.location` tipe `geography(Point, 4326)` untuk PostGIS queries.

## 🚧 Development Rules

🚨 **WAJIB DIPATUHI:**

1. **Tech Stack Consistency** - Full JavaScript stack (Next.js + Express.js + Prisma). NO PHP/Laravel.
2. **PostGIS Priority** - Semua geolocation query HARUS menggunakan PostGIS (`ST_DWithin`, `ST_Distance`).
3. **Input Validation** - Validasi di server menggunakan Zod; reject invalid input dengan pesan yang jelas.
4. **Error Handling** - Format error seragam: `{ status: "error", message: "...", errors: [] }`.
5. **Real-time Updates** - Gunakan Socket.IO untuk order status notifications.
6. **No Payment Gateway (MVP)** - E-Wallet/payment gateway TIDAK diimplementasikan di v1.
7. **Digital Receipt Required** - Setiap transaksi COMPLETED harus generate digital receipt.

## 📦 Deployment

### Vercel (Frontend)
```bash
npm install -g vercel
vercel
```

### Railway / Render (Backend)
1. Push repository ke GitHub
2. Connect GitHub ke Railway/Render
3. Set environment variables di dashboard
4. Deploy otomatis setiap push ke `main` branch

**Database Deployment:** Gunakan managed PostgreSQL dari Railway/Render, pastikan PostGIS extension aktif.

## 📝 Roadmap

| Phase | Target | Deliverable |
|-------|--------|-------------|
| **MVP (v1.0)** | OLIVIA Competition | Smart Search (PostGIS), End-to-End OMS, Mutual Rating, Digital Receipt |
| **v1.5** | 3 months post-launch | Premium listing logic, notification enhancement, query optimization |
| **v2.0** | 6-12 months | E-Wallet integration, Subscription management, In-app chat, City expansion |
| **v3.0** | Vision | Big data dashboard, B2B/B2G data monetization, Smart city analytics |

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/your-feature`
2. Follow existing code patterns
3. Write tests untuk fitur baru
4. Submit pull request dengan deskripsi jelas

## 📄 License

Private project untuk Lomba OLIVIA.

## 👥 Team

**Developed for OLIVIA Competition @ Yogyakarta**

---

## 📞 Support & Questions

- GitHub Issues: [Create an issue](https://github.com/yourusername/be-rongsok.in/issues)
- Email: contact@rongsok.in *(coming soon)*

---

**Rongsok.in — Connecting Waste to Value** ♻️
