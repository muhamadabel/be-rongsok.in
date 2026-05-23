# Frontend Implementation Guide — Rongsok.in
**Tech Stack:** Next.js (App Router), Tailwind CSS, Lucide React (Icons), Leaflet.js, Socket.io-client.

---

## 1. Design System (Sky Blue)
Gunakan Tailwind CSS dengan extend warna berikut:
- **Primary:** `#0EA5E9` (sky-500)
- **Secondary:** `#BAE6FD` (sky-200)
- **Dark:** `#0369A1` (sky-700)
- **Font:** 'Inter' atau 'Outfit' dari Google Fonts.

---

## 2. Page Structure
- `/`: Landing Page (Value Proposition).
- `/auth/login` & `/auth/register`: Autentikasi.
- `/onboarding`: Pemilihan role & pengisian profil awal.
- `/customer/dashboard`: Map view, pencarian pengepul, list pesanan aktif.
- `/collector/dashboard`: Pesanan masuk (Real-time), manajemen harga, toggle status buka.
- `/admin/dashboard`: (Internal) Moderasi user, kelola kategori sampah, monitoring transaksi.
- `/order/[id]`: Tracking page (Stepper status: Pending -> Confirmed -> Progress -> Done).

---

## 3. Core Components
- `MapContainer`: Wrapper Leaflet.js untuk menampilkan titik-titik pengepul.
- `OrderCard`: Informasi singkat pesanan (Foto, Kategori, Estimasi).
- `StatusStepper`: Visualisasi progress transaksi.
- `RatingPopup`: Modal feedback setelah transaksi `COMPLETED`.

---

## 4. State & Integration
- **Auth State:** Gunakan `Context API` atau `Zustand` untuk menyimpan data user & token.
- **Data Fetching:** Gunakan `SWR` atau `TanStack Query` untuk fetching data API agar auto-revalidate.
- **Geolocation:** Gunakan `navigator.geolocation` dengan prompt permission yang jelas.
- **Real-time:** Inisialisasi socket connection di `Layout.tsx` dan gunakan hook untuk listen event `order_status_update`.

---

## 5. Development Rules
1. **Responsive:** Wajib Mobile-First (Base styling untuk layar 360px).
2. **Components:** Gunakan Functional Components dengan TypeScript.
3. **API Client:** Buat wrapper `axios` atau `fetch` dengan interceptor untuk menyisipkan Bearer Token.
4. **Loading States:** Gunakan Skeleton screens saat data sedang di-fetch.
