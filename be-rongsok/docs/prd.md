# RONGSOK.IN
### Platform Ekosistem Daur Ulang Sirkular
**Product Requirements Document** | Versi 1.0 — MVP Release
Target Wilayah: Kota Yogyakarta | Submission: Lomba OLIVIA

---

## Daftar Isi
1. [Executive Summary](#1-executive-summary)
2. [User Personas](#2-user-personas)
3. [User Stories & Epics](#3-user-stories--epics)
4. [Functional Requirements](#4-functional-requirements)
5. [Non-Functional Requirements](#5-non-functional-requirements)
6. [Skema Database](#6-skema-database-ringkasan)
7. [Acceptance Criteria](#7-acceptance-criteria-definition-of-done)
8. [Business & Revenue Model](#8-business--revenue-model)
9. [Out of Scope](#9-out-of-scope-mvp-v1)
10. [Roadmap Pengembangan](#10-roadmap-pengembangan)

---

## 1. Executive Summary

### 1.1 Pernyataan Masalah

Jutaan kilogram sampah daur ulang — kardus, plastik, besi, kertas — setiap harinya terbuang sia-sia karena rantai distribusi antara penghasil sampah (rumah tangga, mahasiswa/kos-kosan) dan pengepul tradisional bersifat informal, tidak efisien, dan penuh ketidakpercayaan. Kedua belah pihak tidak memiliki platform terstruktur untuk saling menemukan, bernegosiasi harga secara transparan, dan mencatat transaksi secara digital.

### 1.2 Solusi

Rongsok.in adalah platform mobile-first berbasis web yang mengintegrasikan geolocation, manajemen pesanan, dan sistem rating dua arah untuk menghubungkan penghasil sampah (**Customer**) dengan pengepul (**Lapak/Gudang**) secara langsung, transparan, dan efisien. Setiap pengguna memilih perannya satu kali saat registrasi, sehingga antarmuka dan fitur yang tersedia langsung relevan sejak pertama kali masuk.

### 1.3 Tujuan Produk (Objective)

- Membuktikan kelayakan teknis alur transaksi end-to-end dari pencarian hingga digital receipt.
- Membangun trust score dua arah antara Customer dan Pengepul melalui Mutual Rating.
- Menjadi fondasi data anonimasi untuk peluang bisnis B2B/B2G di roadmap v2.
- Menvalidasi pasar awal di Kota Yogyakarta, khususnya ekosistem mahasiswa dan kos-kosan.

### 1.4 Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| Frontend | Next.js (React) | SSR + routing berbasis halaman, UI Biru Sky — kombinasi ala Tokopedia |
| Backend | Express.js (Node.js) | REST API, middleware-based, lightweight dan fleksibel |
| Database | Supabase (PostgreSQL + PostGIS) | Relational data + ekstensi spasial untuk query radius geolocation (Free Tier) |
| ORM | Prisma | Schema management, type-safe query, migrasi database |
| Real-time | Socket.IO | Notifikasi pesanan real-time ke Pengepul |
| Storage | Cloudinary | Upload dan serving foto sampah dari Customer (Free Tier) |
| Auth | JWT (jsonwebtoken) + bcrypt | Token-based auth stateless untuk integrasi Next.js SPA |
| Deployment | Vercel (FE) + Home Lab Server (BE) | Managed via Docker Swarm & CapRover, routed through Cloudflare Tunnels |

> **Catatan Stack:** Full JavaScript end-to-end (Next.js + Express.js). Tidak ada PHP/Laravel. Prisma menggantikan Eloquent sebagai ORM dengan developer experience yang lebih modern.

---

## 2. User Personas

### 2.1 Persona A — "Anak Kos Jogja" (Customer)

| Atribut | Detail |
|---|---|
| Nama | Rizky, 21 tahun |
| Profil | Mahasiswa aktif, tinggal di kos dekat UGM/UNY. Memiliki tumpukan kardus bekas belanja online dan botol plastik. |
| Pain Point | Tidak tahu ada pengepul terdekat, harga tidak jelas, malu teriak-teriak di jalan menunggu mobil rongsok lewat. |
| Goal | Jual sampah dengan mudah, harga adil, tanpa harus keluar terlalu jauh dari kos. |
| Behavior | Aktif di smartphone, familiar dengan aplikasi seperti Gojek/Tokopedia. Lebih suka 'request' daripada aktif mencari. |
| Role Saat Registrasi | Memilih **Customer** di onboarding screen. |
| Preferred Flow | Minta Jemput (pick-up) langsung ke kos. |

### 2.2 Persona B — "Tukang Rongsok Digital" (Pengepul)

| Atribut | Detail |
|---|---|
| Nama | Pak Budi, 45 tahun |
| Profil | Pengepul tradisional yang sudah 15 tahun keliling Jogja. Punya gudang kecil di area Condongcatur. |
| Pain Point | Area keliling tidak efisien, sering kosong tangan. Tidak ada cara untuk mengumumkan harga beli ke banyak orang sekaligus. |
| Goal | Mendapat lebih banyak pesanan yang terverifikasi, mengurangi jarak keliling yang sia-sia, mencatat transaksi dengan rapi. |
| Behavior | Familiar dengan WhatsApp, mulai nyaman dengan smartphone. Butuh antarmuka yang sederhana. |
| Role Saat Registrasi | Memilih **Pengepul** di onboarding screen. Diarahkan ke form pengisian profil lapak setelah registrasi berhasil. |
| Preferred Flow | Menerima notifikasi langsung, konfirmasi dengan satu klik, lalu berangkat. |

### 2.3 Persona C — Admin Platform

| Atribut | Detail |
|---|---|
| Peran | Pengelola platform Rongsok.in (Tim Internal) |
| Tanggung Jawab | Moderasi konten, manajemen kategori sampah master, penanganan sengketa (dispute), dan monitoring data agregat. |
| Akses | Dashboard admin panel dengan akses penuh ke semua entitas data. |

---

## 3. User Stories & Epics

### Epic 1: Autentikasi & Manajemen Akun

| ID | User Story | Prioritas |
|---|---|---|
| US-01 | Sebagai **Pengguna baru**, saya ingin memilih role (**Customer** atau **Pengepul**) saat registrasi sehingga antarmuka yang saya dapatkan langsung relevan. | Must Have |
| US-02 | Sebagai **Pengguna baru**, saya ingin mendaftar dengan nama, email, dan password sehingga saya punya akun di platform. | Must Have |
| US-03 | Sebagai **Pengepul** yang baru terdaftar, saya ingin diarahkan ke form profil lapak (nama lapak, radius, foto) setelah registrasi selesai. | Must Have |
| US-04 | Sebagai **Pengguna**, saya ingin login dan logout dengan aman sehingga data saya terlindungi. | Must Have |

### Epic 2: Pencarian & Discovery

| ID | User Story | Prioritas |
|---|---|---|
| US-05 | Sebagai **Customer**, saya ingin mencari pengepul berdasarkan jenis sampah sehingga saya bisa menemukan yang relevan. | Must Have |
| US-06 | Sebagai **Customer**, saya ingin melihat daftar pengepul diurutkan berdasarkan jarak dan rating sehingga saya bisa memilih yang terbaik. | Must Have |
| US-07 | Sebagai **Customer**, saya ingin melihat profil pengepul (harga, ulasan, radius) sebelum membuat pesanan. | Must Have |
| US-08 | Sebagai **Customer**, saya ingin melihat badge 'Verified/Prioritas' pada pengepul premium. | Should Have (Mock UI) |

### Epic 3: Order Management System

| ID | User Story | Prioritas |
|---|---|---|
| US-09 | Sebagai **Customer**, saya ingin memilih 'Minta Jemput' atau 'Antar Sendiri' saat membuat pesanan. | Must Have |
| US-10 | Sebagai **Customer**, saya ingin mengunggah foto sampah dan mengisi perkiraan berat saat membuat pesanan. | Must Have |
| US-11 | Sebagai **Pengepul**, saya ingin menerima notifikasi real-time saat ada pesanan masuk. | Must Have |
| US-12 | Sebagai **Pengepul**, saya ingin bisa menerima atau menolak pesanan dari dalam aplikasi. | Must Have |
| US-13 | Sebagai **Pengepul**, saya ingin memasukkan berat aktual dan total harga setelah menimbang. | Must Have |
| US-14 | Sebagai **Customer**, saya ingin menerima notifikasi konfirmasi harga sebelum transaksi dinyatakan selesai. | Must Have |

### Epic 4: Rating & Digital Receipt

| ID | User Story | Prioritas |
|---|---|---|
| US-15 | Sebagai **Customer**, saya ingin memberikan rating bintang dan ulasan teks ke Pengepul setelah transaksi selesai. | Must Have |
| US-16 | Sebagai **Pengepul**, saya ingin memberikan rating kualitas sampah ke Customer setelah transaksi selesai. | Must Have |
| US-17 | Sebagai **Pengguna**, saya ingin melihat riwayat transaksi saya (tanggal, jenis sampah, berat, total) secara lengkap. | Must Have |

---

## 4. Functional Requirements

### 4.1 Modul Autentikasi & Role Selection

- Layar onboarding menampilkan dua pilihan role untuk pengguna publik: **Customer** atau **Pengepul**. Role **Admin** bersifat internal dan hanya dapat dibuat melalui manajemen database atau seeding. Pilihan role disimpan pada field `role` di tabel `users` dan bersifat permanen (tidak bisa diubah sendiri tanpa intervensi Admin, untuk menjaga integritas data).
- Registrasi menerima input: nama lengkap, email, password (min. 8 karakter, di-hash dengan bcrypt).
- Jika role = `collector`: setelah submit registrasi, pengguna diarahkan ke halaman **Lengkapi Profil Lapak** sebelum bisa mengakses dashboard.
- Jika role = `customer`: langsung diarahkan ke halaman utama pencarian.
- Login menghasilkan JWT yang disimpan di HTTP-only cookie pada klien Next.js.
- Refresh token otomatis untuk sesi aktif. Logout menghapus cookie dan menginvalidasi token (blacklist via Redis atau DB flag).

### 4.2 Modul Geolocation & Pencarian

- Deteksi lokasi otomatis via browser Geolocation API di sisi klien.
- Query pencarian pengepul menggunakan PostGIS: `ST_DWithin()` untuk filter radius, diurutkan `ST_Distance()` untuk jarak terdekat.
- Filter sekunder: berdasarkan kategori sampah yang diterima Pengepul.
- Sorting default: `(1) is_premium DESC`, `(2) jarak ASC`, `(3) avg_rating DESC`.
- Peta interaktif menggunakan **Leaflet.js** + tile dari OpenStreetMap (free, tanpa API key berbayar).

### 4.3 Modul Katalog & Harga Dinamis

- Pengepul dapat menambah/mengedit kategori sampah yang diterima dari master list (dikelola Admin).
- Setiap kategori dikonfigurasi: harga minimum (Rp/kg), harga maksimum (Rp/kg), dan status aktif/nonaktif.
- Tampilan range harga di profil Pengepul: contoh **"Kardus: Rp 4.000 – Rp 7.000/kg"**.

### 4.4 Modul Order Management System (OMS)

Status pesanan mengikuti state machine berikut:

| Status | Deskripsi | Trigger |
|---|---|---|
| `PENDING` | Pesanan dibuat Customer, broadcast ke Pengepul terdekat. | Customer submit form pesanan |
| `CONFIRMED` | Salah satu Pengepul menerima pesanan. | Pengepul klik 'Terima' |
| `IN_PROGRESS` | Pengepul dalam perjalanan / Customer menuju lapak. | Otomatis setelah CONFIRMED |
| `AWAITING_CONFIRMATION` | Pengepul submit data timbangan & harga, menunggu persetujuan Customer. | Pengepul submit form validasi |
| `COMPLETED` | Customer konfirmasi harga. Transaksi selesai. | Customer klik 'Setuju' |
| `CANCELLED` | Pesanan dibatalkan (timeout 15m atau ditolak semua). | Sistem timeout / Semua kandidat menolak |

- Notifikasi real-time menggunakan **Socket.IO** untuk setiap perubahan status pesanan.
- Batas waktu konfirmasi Pengepul: **15 menit**. Jika lewat, pesanan otomatis `CANCELLED`.
- Foto sampah yang diunggah Customer disimpan di Cloudinary (Free Tier) dan dilampirkan pada detail pesanan.

### 4.5 Modul Validasi & Digital Receipt

- Form input oleh Pengepul: berat aktual (kg), harga per kg; total dihitung otomatis oleh sistem.
- Notifikasi push ke Customer berisi: jenis sampah, berat, harga/kg, dan total harga.
- Customer memiliki 2 opsi: **'Setuju'** → status `COMPLETED`, atau **'Negosiasi'** → kembali ke `AWAITING_CONFIRMATION` dengan catatan.
- Setelah `COMPLETED`, sistem menerbitkan digital receipt berisi: ID transaksi, tanggal, nama Pengepul, detail item, berat, dan total harga.
- Digital receipt dapat diakses kembali dari halaman Riwayat Transaksi kapan saja.

### 4.6 Modul Mutual Rating & QC

- Pop-up rating muncul otomatis setelah status berubah menjadi `COMPLETED` untuk kedua pihak.
- **Rating Customer → Pengepul:** bintang 1–5 + teks ulasan (opsional). Metrik: kejujuran timbangan, keramahan, ketepatan waktu.
- **Rating Pengepul → Customer:** bintang 1–5. Metrik: kebersihan sampah, akurasi deskripsi/foto.
- Rata-rata rating diakumulasikan otomatis dan tampil di profil masing-masing pengguna.
- Satu transaksi hanya bisa dirating satu kali per pihak (`unique constraint` di database pada kolom `order_id + rater_id`).

---

## 5. Non-Functional Requirements

| Kategori | Requirement | Target |
|---|---|---|
| Performance | Waktu muat halaman utama (First Contentful Paint) | < 2 detik pada koneksi 4G |
| Performance | Response time API endpoint pencarian pengepul | < 500ms dengan data seed 100 pengepul |
| Scalability | Arsitektur database | PostGIS query dioptimasi dengan spatial index (GIST) |
| Security | Autentikasi API | Semua endpoint (kecuali registrasi/login) wajib Bearer JWT |
| Security | Upload foto | Validasi tipe file (jpeg/png/webp), ukuran maks 5MB |
| Security | Input validation | Semua input form divalidasi di sisi server (express-validator / Zod) |
| UI/UX | Design System | Biru Sky — kombinasi palet ala Tokopedia: `#0EA5E9` (sky-500) primer, `#BAE6FD` (sky-200) aksen, `#0369A1` (sky-700) dark |
| UI/UX | Responsivitas | Mobile-first. Layout usable pada layar 360px hingga 1440px |
| UI/UX | Aksesibilitas | Kontras teks minimum WCAG AA (4.5:1 untuk teks normal) |
| Reliability | Error handling | Semua error API mengembalikan JSON terstruktur dengan HTTP status code yang tepat |
| Reliability | State offline | Menampilkan pesan error yang informatif saat koneksi terputus |

---

## 6. Skema Database (Ringkasan)

| Tabel | Kolom Utama | Keterangan |
|---|---|---|
| `users` | `id, name, email, password_hash, phone, role (ENUM: customer/collector), avg_rating, location (GEOGRAPHY POINT), created_at` | Role dipilih saat registrasi, satu tabel untuk semua pengguna |
| `collector_profiles` | `id, user_id, lapak_name, description, radius_km, is_open, is_premium, priority_score` | Hanya eksis jika `role = collector`. Di-create otomatis setelah onboarding Pengepul |
| `waste_categories` | `id, name, icon_url` | Master data kategori sampah (dikelola Admin) |
| `collector_catalogs` | `id, collector_id, category_id, min_price, max_price, is_active` | Harga beli per kategori per Pengepul |
| `orders` | `id, customer_id, collector_id (NULLABLE), category_id, method (ENUM: pickup/dropoff), photo_url, estimated_weight, status (ENUM), actual_weight, agreed_price, total_price, notes, created_at` | Tabel inti transaksi. `collector_id` terisi saat status berubah dari PENDING. |
| `order_collectors` | `id, order_id, collector_id, status (ENUM: notified/rejected)` | Mapping broadcast pesanan ke kandidat pengepul dalam radius. |
| `ratings` | `id, order_id, rater_id, ratee_id, score (1-5), review_text, created_at` | Unique constraint: `(order_id, rater_id)` |
| `receipts` | `id, order_id, issued_at, details_json` | Snapshot data transaksi final untuk digital receipt |

---

## 7. Acceptance Criteria (Definition of Done)

### 7.1 MVP Core Flow

| Fitur | Kriteria Selesai (Done) |
|---|---|
| Role Selection & Registrasi | User dapat memilih role di onboarding, mengisi form, dan akun tersimpan dengan `role` yang benar. Pengepul diarahkan ke form profil lapak. Customer diarahkan ke halaman utama. |
| Login | User dapat login dan menerima JWT via HTTP-only cookie. Token invalid setelah logout. |
| Aktivasi Profil Pengepul | Pengepul mengisi profil lapak dan muncul di hasil pencarian Customer. |
| Smart Search | Query pencarian dengan keyword 'Kardus' mengembalikan daftar pengepul dalam radius 5km dari lokasi test, diurutkan jarak. Menggunakan PostGIS. |
| Buat Pesanan | Customer membuat pesanan (pilih metode, upload foto, submit). Status awal `PENDING`. Pengepul menerima notifikasi Socket.IO dalam < 5 detik. |
| Konfirmasi Pengepul | Pengepul dapat menerima (`CONFIRMED`) atau menolak (`CANCELLED`) pesanan. Status terupdate di HP Customer secara real-time. |
| Validasi & Receipt | Pengepul submit data timbangan. Customer menerima notifikasi detail harga. Setelah Customer klik 'Setuju', status jadi `COMPLETED` dan digital receipt terbentuk di database. |
| Mutual Rating | Setelah `COMPLETED`, kedua pihak mendapat pop-up rating. Rating tersimpan dan rata-rata di profil masing-masing terupdate. |
| Riwayat Transaksi | Halaman riwayat menampilkan semua transaksi `COMPLETED` dengan detail receipt yang bisa diakses kembali. |

### 7.2 Mock Features (UI Only — Logika di v2)

| Fitur | Kriteria Done untuk MVP |
|---|---|
| Premium Listing Badge | Badge 'Verified/Prioritas' tampil di card Pengepul tertentu. Data `is_premium` di-hardcode/seed untuk demo. Logika pembayaran langganan: skip. |
| E-Wallet Integration | Tampil sebagai opsi UI 'Bayar via E-Wallet (Segera Hadir)' yang disabled. Tidak ada logika payment gateway. |

---

## 8. Business & Revenue Model

### 8.1 Model Pendapatan (Roadmap)

| Revenue Stream | Kategori | Deskripsi | Status |
|---|---|---|---|
| Premium Listing | B2C | Pengepul membayar langganan bulanan untuk mendapat badge 'Verified/Prioritas' dan posisi teratas di hasil pencarian. Implementasi: kolom `is_premium + priority_score` di tabel `collector_profiles`. | v2 |
| Monetisasi Data | B2B/B2G | Penjualan data agregat anonim (pola sampah per wilayah) kepada perusahaan logistik, pabrik daur ulang, dan Pemerintah Daerah (DLH) untuk Smart City Analytics. | v2/Visi |
| Commitment Fee | Administrative | Biaya aktivasi akun Pengepul (satu kali) + maintenance fee 6 bulan sebagai filter kualitas dan menutup biaya operasional server. | v2 |

### 8.2 Visi Jangka Panjang

Rongsok.in bukan sekadar marketplace rongsok. Data transaksi yang terkumpul secara berkelanjutan membentuk peta persebaran dan pola konsumsi material daur ulang di level kota. Dengan cukupnya volume data, platform ini dapat bertransisi menjadi penyedia **Smart City Analytics** untuk mendukung kebijakan lingkungan berbasis data di kota-kota Indonesia.

---

## 9. Out of Scope (MVP v1)

Fitur-fitur berikut secara eksplisit **tidak akan dibangun** dalam fase MVP ini:

| Fitur | Alasan di-skip |
|---|---|
| E-Wallet / Payment Gateway Integration | Integrasi Midtrans/Xendit membutuhkan effort signifikan, proses KYB bisnis, dan testing yang panjang. Melampaui kebutuhan demo lomba. |
| Big Data Dashboard & Analitik | Membutuhkan volume data transaksi nyata yang cukup besar untuk bermakna. Dimasukkan sebagai visi di pitch deck. |
| Logika Langganan Premium | Backend subscription management (billing cycle, payment, expiry) adalah fitur kompleks tersendiri. |
| In-app Chat / Messaging | Komunikasi antar pihak dilakukan di luar platform (WhatsApp/telepon) untuk MVP. In-app chat masuk roadmap v2. |
| Manajemen Armada Pengepul | Tracking GPS live Pengepul saat menuju lokasi bukan prioritas MVP. |
| Multi-kota / Ekspansi Nasional | Fokus validasi di Yogyakarta. Infrastruktur multi-tenant masuk roadmap pasca-lomba. |
| Sistem Dispute Kompleks | Mekanisme eskalasi sengketa yang rumit (arbitrase, kompensasi) belum diperlukan di tahap validasi awal. |
| Perubahan Role Pasca Registrasi | Role dipilih satu kali saat registrasi dan bersifat permanen di v1. Self-service role-change masuk v2. |

---

## 10. Roadmap Pengembangan

| Fase | Target | Deliverable Utama |
|---|---|---|
| **MVP (v1.0)** | Lomba OLIVIA | Smart Search (PostGIS), OMS end-to-end (Socket.IO), Mutual Rating, Digital Receipt. Stack: Next.js + Express.js + Prisma. Wilayah: Yogyakarta (seed data). |
| **Post-MVP (v1.5)** | 3 Bulan Pasca Lomba | Logika Premium Listing, notification enhancement, optimasi performa query PostGIS, penambahan kategori sampah. |
| **v2.0** | 6–12 Bulan | E-Wallet Integration (Midtrans), Subscription Management, In-app Chat, Self-service role-change, Ekspansi kota kedua. |
| **v3.0 (Visi)** | > 12 Bulan | Big Data Dashboard, B2B/B2G Data Monetization, Smart City Analytics API, Ekspansi nasional. |

---

*Rongsok.in — Connecting Waste to Value*
*Dokumen ini bersifat konfidensial dan dipersiapkan untuk keperluan Lomba OLIVIA.*