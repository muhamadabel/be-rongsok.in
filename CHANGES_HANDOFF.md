# Handoff — Endpoint Lengkap untuk FE

> **Untuk:** Janu (maintainer BE)
> **Branch:** `feat/complete-be` (dari `origin/main` / multi-category)
> **Commit:** `0dce7e6` — "feat: lengkapi endpoint yang dibutuhkan FE"
>
> Semua perubahan sudah **syntax-checked**, **module-load tested**, dan **boot-tested** (server jalan, route wiring benar). Belum dijalankan migrasi DB (nunggu kamu).

---

## 🚀 Cara Deploy (3 langkah)

```bash
# 1. Merge branch ini ke main (atau cherry-pick commit 0dce7e6)
git checkout main
git merge feat/complete-be

# 2. Apply perubahan schema ke DB (cuma nambah 1 kolom nullable: User.phone — AMAN, non-destruktif)
cd be-rongsok
npx prisma db push
npx prisma generate

# 3. Redeploy CapRover (push ke remote yang ke-track CapRover, atau caprover deploy)
git push origin main
```

> **Catatan migrasi:** Repo ini pakai `prisma db push` (schema-first), bukan `migrate dev`.
> Perubahan DB satu-satunya: tambah kolom `phone String?` di tabel `User`.
> Karena nullable, `db push` aman tanpa data loss.

---

## 📋 Apa yang berubah

### Schema (`prisma/schema.prisma`)
| Perubahan | Detail |
|---|---|
| `User.phone String?` | Kolom baru. FE sudah kirim `phone` saat register & edit profil. |

### Endpoint BARU
| Method | Path | Auth | Fungsi |
|---|---|---|---|
| `GET` | `/orders` | user | List order milik user. Query: `status`, `role` (customer/collector), `limit`. Include items+category. |
| `GET` | `/discovery/collectors/:id` | publik | Detail lapak + user + catalogs. Untuk halaman detail pengepul di FE. |
| `PATCH` | `/auth/me` | user | Update `name`, `phone`, `avatarUrl`, `lat`, `lng`. Lokasi disimpan ke `User.location` (PostGIS). |
| `GET` | `/admin/stats` | ADMIN | KPI (tonase, payout, active, users) + grafik 7 hari. |
| `GET` | `/admin/orders` | ADMIN | Monitoring transaksi. Query: `status`, `page`, `limit`. |
| `POST` | `/admin/categories` | ADMIN | Tambah kategori sampah. |
| `PATCH` | `/admin/categories/:id` | ADMIN | Edit kategori. |
| `DELETE` | `/admin/categories/:id` | ADMIN | Hapus kategori (ditolak kalau masih dipakai). |

### Endpoint yang DIUBAH
| Method | Path | Perubahan |
|---|---|---|
| `GET` | `/discovery/search` | **Lepas `protect`** (jadi publik) + `categoryId` jadi **opsional** (LEFT JOIN). Landing page bisa fetch tanpa login. |
| `GET` | `/auth/me` | Return tambahan: `phone`, `lat`, `lng` (di-parse dari PostGIS via raw query). |
| `POST` | `/auth/register` | Terima `phone` (sebelumnya di-drop). |
| `PATCH` | `/orders/:id` | Tambah action **`reject`** (collector tolak — OrderCollector jadi 'rejected', order tetap PENDING) & **`cancel`** (status → CANCELLED, cek ownership). |
| JWT | `utils/auth.generateToken` | Sekarang encode `{ id, role }` (sebelumnya cuma `id`). Login & register dipanggil dengan `user` object. |
| Middleware | `middlewares/auth.authorize` | Sekarang **enforce role** (sebelumnya placeholder kosong). Dipakai di route admin. |

---

## ⚠️ Hal Penting

1. **Token lama jadi invalid untuk admin.** JWT lama cuma punya `id`, tidak ada `role`. User yang sudah login pakai token lama tidak bisa akses `/admin/*` (kena 403) sampai mereka **login ulang** (dapat token baru dengan role). Untuk user biasa (customer/collector) tetap jalan normal — `protect` tidak butuh role.

2. **Akun ADMIN.** Pastikan ada user dengan `role = 'ADMIN'` di DB untuk tes admin console. Bisa lewat seed atau update manual:
   ```sql
   UPDATE "User" SET role = 'ADMIN' WHERE email = 'admin@rongsok.in';
   ```

3. **PostGIS location.** `PATCH /auth/me` & `GET /auth/me` pakai `ST_MakePoint`/`ST_Y`/`ST_X`. Pastikan ekstensi PostGIS aktif (sudah, karena search juga pakai).

---

## 🧪 Smoke Test (setelah deploy)

```bash
B=https://be-rongsokin.hallojanu.xyz/api/v1

# Publik (harus 200/400, bukan 401)
curl "$B/discovery/search?lat=-7.7956&lng=110.3695"          # 200 (list, tanpa categoryId)
curl "$B/discovery/collectors/<id-lapak-valid>"               # 200 detail

# Auth (login dulu, simpan token)
TOKEN="..."
curl "$B/orders?limit=5" -H "Authorization: Bearer $TOKEN"    # 200 list order
curl -X PATCH "$B/auth/me" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","phone":"08123","lat":-7.79,"lng":110.36}' # 200

# Admin (login sebagai role ADMIN)
ADMIN="..."
curl "$B/admin/stats" -H "Authorization: Bearer $ADMIN"        # 200 stats
```

---

## 📂 File yang Disentuh

```
be-rongsok/
├── prisma/schema.prisma            (M) User.phone
└── src/
    ├── server.js                   (M) mount /api/v1/admin
    ├── utils/auth.js               (M) generateToken include role
    ├── middlewares/auth.js         (M) authorize enforce role
    ├── controllers/
    │   ├── auth.js                 (M) register+phone, me+lat/lng, updateMe (baru)
    │   ├── discovery.js            (M) search publik+opsional, getCollectorById (baru)
    │   ├── order.js                (M) getOrders (baru), reject & cancel
    │   └── admin.js                (A) BARU — stats, orders, categories CRUD
    └── routes/
        ├── auth.js                 (M) PATCH /me
        ├── discovery.js            (M) lepas protect, +collectors/:id
        ├── order.js                (M) +GET /
        └── admin.js                (A) BARU
```

FE (repo terpisah, `D:\rongsok`) sudah 100% siap konsumsi semua endpoint ini — begitu deploy, fitur langsung jalan tanpa ubah FE.
