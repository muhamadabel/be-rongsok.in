# Backend Implementation Guide — Rongsok.in
**Tech Stack:** Express.js, Prisma ORM, Supabase (PostgreSQL + PostGIS), Socket.IO, JWT. Hosted on Render (Free Tier).

---

## 1. Database Schema (Prisma)
Gunakan PostGIS untuk kolom lokasi. Pastikan ekstensi `postgis` diaktifkan di PostgreSQL.

```prisma
// Contoh ringkasan schema.prisma
model User {
  id            String    @id @default(uuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(CUSTOMER)
  avatarUrl     String?
  location      Unsupported("geography(Point, 4326)")?
  avg_rating    Float     @default(0)
  createdAt     DateTime  @default(now())
  collectorProfile CollectorProfile?
}

enum Role {
  CUSTOMER
  COLLECTOR
  ADMIN
}

model Order {
  id              String      @id @default(uuid())
  status          OrderStatus @default(PENDING)
  method          OrderMethod
  photoUrl        String
  transactionProofUrl String?
  estWeight       Float
  actualWeight    Float?
  totalPrice      Float?
  customer        User        @relation("CustomerOrders", fields: [customerId], references: [id])
  customerId      String
  collector       User?       @relation("CollectorOrders", fields: [collectorId], references: [id])
  collectorId     String?
}

enum OrderStatus {
  PENDING
  CONFIRMED
  IN_PROGRESS
  AWAITING_CONFIRMATION
  COMPLETED
  CANCELLED
}
```

---

## 2. API Specifications

### Base URL: `/api/v1`

#### Auth Module
- `POST /auth/register`: Nama, Email, Password, Role, `avatarUrl` (opsional).
- `POST /auth/login`: Email, Password. Return: `access_token` (JWT), `user` info.
- `GET /auth/me`: Get current user info from JWT (includes `avatarUrl`).

#### Profile Module (Collector)
- `POST /collector/profile`: Setup nama lapak, radius_km, kategori sampah, `shopImageUrl` (opsional).
- `PATCH /collector/profile`: Update status buka/tutup, harga, `shopImageUrl` (opsional).

#### Discovery Module
- `GET /discovery/search`: 
  - Query: `lat`, `lng`, `category_id`.
  - Logic: Gunakan `ST_DWithin` untuk radius dan `ST_Distance` untuk sorting.
  - Return: List Pengepul terdekat yang aktif.

#### Order Module (OMS)
- `POST /orders`: Buat pesanan baru (Customer, dengan `photoUrl` opsional).
- `GET /orders/:id`: Detail pesanan.
- `PATCH /orders/:id/accept`: Pengepul mengambil pesanan `PENDING`.
- `PATCH /orders/:id/validate`: Pengepul input berat aktual, harga final, `transactionProofUrl` (opsional).
- `PATCH /orders/:id/confirm`: Customer setuju harga (Status -> `COMPLETED`, generate `Receipt` dengan `transactionProofUrl`).

---

## 3. Real-time (Socket.IO)
- **Room naming:** `collector:{id}` dan `order:{id}`.
- **Events:**
  - `new_order`: Dikirim ke room `collector:{id}` saat ada pesanan masuk dalam radius.
  - `order_status_update`: Dikirim ke room `order:{id}` saat status berubah.

---

## 4. Development Rules
1. **Validation:** Gunakan `Zod` untuk skema input.
2. **Security:** JWT di-set di Header `Authorization: Bearer <token>`.
3. **Error Handling:** Format error seragam `{ status: "error", message: "...", errors: [] }`.
4. **PostGIS:** Gunakan `$queryRaw` Prisma untuk query spasial yang kompleks.
