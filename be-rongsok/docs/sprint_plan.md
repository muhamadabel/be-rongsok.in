# Sprint Plan: Rongsok.in — 20 Days to MVP
**Platform Ekosistem Daur Ulang Sirkular**
Target: Lomba OLIVIA | Durasi: 20 Hari

---

## Tim Proyek
- **PM (Product Manager):** Naila
- **BE (Backend Engineer):** Janu
- **FE (Frontend Engineer):** Abel

---

## Pembagian Sprint
Proyek dibagi menjadi 2 Sprint (masing-masing 10 hari).

### Sprint 1: Foundation & Discovery (Hari 1–10)
**Goal:** User bisa registrasi, login, melengkapi profil, dan mencari pengepul terdekat.

| Hari | Naila (PM) | Janu (BE) | Abel (FE) |
| :--- | :--- | :--- | :--- |
| **1-2** | [ ] Finalisasi SPEC teknis, pembuatan backlog di Trello/Jira, koordinasi aset logo. | [ ] Setup Repo (Express), DB Migration (Prisma + PostGIS), setup JWT Auth. | [ ] Setup Repo (Next.js), integrasi Design System (Sky Blue), Layout Dasar. |
| **3-4** | [ ] Penentuan Kategori Sampah master & skema harga simulasi. | [ ] API Auth (Register, Login, Role Selection) & Middleware. | [ ] UI Onboarding: Role Selection, Form Register & Login. |
| **5-6** | [ ] Riset koordinat titik kumpul di Jogja untuk Seed Data. | [ ] API Profile: CRUD Lapak Pengepul & Katalog Harga. | [ ] UI Dashboard: Onboarding Pengepul (Lengkapi Profil Lapak). |
| **7-8** | [ ] Penulisan Skenario Testing (UAT) untuk modul Discovery. | [ ] Query Geolocation: API Smart Search (ST_DWithin & ST_Distance). | [ ] UI Discovery: Search Bar, Category Filter, Map View (Leaflet.js). |
| **9-10** | [ ] **Sprint Review 1:** Testing flow registrasi s/d pencarian lapak. | [ ] Perbaikan bug API & Optimasi Query PostGIS. | [ ] Integrasi Frontend ke API Discovery & Map interaction. |

---

### Sprint 2: OMS, Real-time & Closing (Hari 11–20)
**Goal:** Flow transaksi end-to-end selesai (Order, Real-time Alert, Digital Receipt, Rating).

| Hari | Naila (PM) | Janu (BE) | Abel (FE) |
| :--- | :--- | :--- | :--- |
| **11-12** | [ ] Desain template Digital Receipt & Form Rating. | [ ] Setup Socket.IO Server & logic broadcast `new_order`. | [ ] UI Order: Form Request Pick-up (Upload Foto & GPS). |
| **13-14** | [ ] Validasi flow "Accept/Reject" & Timeout 15 menit. | [ ] API Order Management: State Machine (Pending -> Confirmed). | [ ] UI Tracking: Real-time update status pesanan (Socket.IO client). |
| **15-16** | [ ] Simulasi penimbangan (Weight Validation) & Harga Final. | [ ] API Validasi: Input berat aktual & Auto-generate Receipt. | [ ] UI Validation: Form Input Pengepul & Konfirmasi Customer. |
| **17-18** | [ ] Quality Control: Cek konsistensi data & performa UI. | [ ] API Mutual Rating & Update Rating Average di Profil. | [ ] UI Rating: Pop-up Star Rating & Histori Transaksi. |
| **19** | [ ] Final UAT & Persiapan Pitch Deck / Video Demo. | [ ] Deployment (Render Free) & Final Debugging. | [ ] Deployment (Vercel) & Polish UI (Animations/Micro-interactions). |
| **20** | [ ] **Release MVP:** Penyerahan dokumen & Demo siap tampil. | [ ] Monitoring Server & Backup Database. | [ ] Final Check Responsivitas Mobile. |

---

## Kunci Keberhasilan (Definition of Done)
1. **Janu (BE):** API terdokumentasi, logic PostGIS akurat, Socket.IO stabil.
2. **Abel (FE):** UI sesuai Design System (Sky Blue), responsif mobile, integrasi API mulus.
3. **Naila (PM):** Semua kriteria di PRD terpenuhi, data seed tersedia, dokumentasi siap.

---
*Rongsok.in — Connecting Waste to Value*
