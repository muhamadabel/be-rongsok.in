# Prompt for Frontend Developer / AI Agent: Rongsok.in System Updates

Dokumen ini berisi panduan instruksi detail bagi tim frontend (atau AI Coding Agent Frontend) untuk merefaktor antarmuka (UI) dan logika state di sisi klien Next.js. Backend Rongsok.in telah diperbarui dengan fitur-fitur baru dan perubahan kontrak API.

---

## 1. Konteks Pembaruan Backend (Sistem OMS & Database)

Sistem Backend Rongsok.in telah di-upgrade dari sistem satu transaksi per kategori sampah (Single-Category) menjadi transaksi terintegrasi **Multi-Category & Multi-Item**, disertai fitur pengantaran langsung (**Drop-off**) dan kontrol kapasitas pengepul.

Poin utama yang diperbarui pada sistem Backend:
1. **Multi-Item Per Transaksi:** Customer dapat menjual beberapa jenis sampah sekaligus dalam satu pesanan (misal: Kardus + Botol Plastik).
2. **Catatan per Item Sampah:** Setiap item dalam pesanan mendukung field opsional `notes` (Keterangan kondisi sampah dari customer).
3. **Deskripsi Kategori Sampah:** Setiap `WasteCategory` kini memiliki field `description` (panduan/syarat kondisi sampah).
4. **Antar Langsung (Drop-off):** Customer dapat memilih pengepul tujuan secara manual di UI dan langsung mengirimkan pesanan ke pengepul tersebut (`collectorId` disematkan, melewati proses broadcast radius).
5. **Batas Kapasitas Pengepul:** Pengepul dibatasi menerima maksimal **5 pesanan aktif** secara bersamaan. Jika melampaui batas, sistem backend akan menolak action `accept` dengan error 400.

---

## 2. Kontrak API Baru (API Contract Changes)

### 2.1. Discovery: Pencarian Kategori Sampah (`GET /discovery/categories`)
Model `WasteCategory` sekarang memiliki field `description` yang dapat ditampilkan sebagai panduan pengumpulan sampah untuk customer.
* **Response schema baru:**
  ```json
  {
    "status": "success",
    "data": [
      {
        "id": "uuid-kardus",
        "name": "Kardus",
        "description": "Karton tebal kemasan, box bekas, pastikan dalam kondisi kering",
        "iconUrl": "https://example.com/icons/kardus.png"
      }
    ]
  }
  ```

### 2.2. Pembuatan Pesanan (`POST /orders`)
* **Endpoint:** `POST /api/v1/orders`
* **Body Request Multi-Item & Catatan (Format Baru - Direkomendasikan):**
  ```json
  {
    "method": "PICKUP", // Atau "DROPOFF"
    "lat": -7.797068,
    "lng": 110.370529,
    "photoUrl": "https://res.cloudinary.com/.../sampah.jpg", // Opsional
    "collectorId": "uuid-pengepul-terpilih", // Wajib diisi jika customer memilih "Antar Langsung" (DROPOFF)
    "items": [
      {
        "categoryId": "uuid-kardus",
        "estimatedWeight": 4.5,
        "notes": "Kardus bekas belanja lecek dikit tapi kering" // Opsional
      },
      {
        "categoryId": "uuid-plastik",
        "estimatedWeight": 1.2,
        "notes": "Botol air mineral bekas, sudah bersih" // Opsional
      }
    ]
  }
  ```
  *(Catatan: Backend masih mendukung format lama `categoryId` dan `estimatedWeight` di root body untuk kompatibilitas ke belakang, namun sangat disarankan untuk beralih ke array `items`.)*

### 2.3. Detail Pesanan (`GET /orders/:id`)
Response order sekarang menyertakan array `items` yang berisi rincian tiap kategori sampah beserta datanya.
* **Struktur Response:**
  ```json
  {
    "status": "success",
    "data": {
      "id": "uuid-order",
      "customerId": "uuid-customer",
      "collectorId": "uuid-collector", // terisi jika di-accept pengepul atau diantar langsung
      "method": "PICKUP",
      "status": "PENDING",
      "estimatedWeight": 5.7, // Total penjumlahan otomatis di backend
      "actualWeight": null,
      "totalPrice": null,
      "createdAt": "2026-05-31T12:00:00.000Z",
      "items": [
        {
          "id": "uuid-item-1",
          "categoryId": "uuid-kardus",
          "estimatedWeight": 4.5,
          "actualWeight": null,
          "agreedPrice": null,
          "notes": "Kardus bekas belanja lecek dikit tapi kering",
          "category": {
            "name": "Kardus",
            "description": "Karton tebal kemasan, box bekas, pastikan dalam kondisi kering"
          }
        }
      ]
    }
  }
  ```

### 2.4. Validasi Timbangan oleh Pengepul (`PATCH /orders/:id` - action `validate`)
Saat pengepul menimbang sampah di lokasi, pengepul harus memasukkan berat aktual dan kesepakatan harga untuk **masing-masing** item sampah yang diserahkan.
* **Body Request:**
  ```json
  {
    "action": "validate",
    "transactionProofUrl": "https://res.cloudinary.com/.../bukti.jpg", // Opsional
    "items": [
      {
        "id": "uuid-item-1", // ID dari OrderItem
        "actualWeight": 5.0,
        "agreedPrice": 5000
      },
      {
        "id": "uuid-item-2",
        "actualWeight": 1.0,
        "agreedPrice": 2000
      }
    ]
  }
  ```

### 2.5. Digital Receipt (`Receipt`)
Setelah customer menyetujui (`confirm`), digital receipt yang diterbitkan berisi breakdown rincian per kategori sampah pada properti `detailsJson.items`.

---

## 3. Panduan Tugas Implementasi Frontend

Terapkan langkah-langkah refactoring berikut pada aplikasi klien Next.js:

### 3.1. Pembaruan Form Pembuatan Order (Sisi Customer)
1. **Sistem Keranjang Sampah (Multi-Category UI):** Ubah pilihan input kategori yang tadinya berupa dropdown/radio tunggal menjadi sistem multi-tambah (seperti keranjang belanja). Customer dapat memilih kategori, mengisi estimasi berat, dan menulis catatan/keterangan spesifik untuk item tersebut, lalu menambahkannya ke list pesanan sebelum di-submit.
2. **Menampilkan Panduan Kategori:** Saat customer memilih kategori sampah (misal: "Plastik"), tampilkan teks `description` dari kategori tersebut sebagai petunjuk kriteria kelayakan sampah.
3. **Pilihan Pengepul & Drop-off:**
   * Di layar pencarian pengepul, jika customer memilih opsi **"Antar Sendiri"** (`DROPOFF`), biarkan customer memilih lapak pengepul di peta/list terlebih dahulu.
   * Kirimkan ID pengepul terpilih tersebut sebagai `collectorId` saat membuat pesanan (`POST /orders`).

### 3.2. Pembaruan Detail Timbangan & Validasi (Sisi Pengepul)
1. **Rincian Form Validasi:** Di dashboard pengepul pada pesanan aktif (`CONFIRMED`), ubah form validasi timbangan agar merender input `actualWeight` (berat aktual) dan `agreedPrice` (harga per kg) untuk **tiap-tiap** item yang terdaftar di `order.items`.
2. **Penanganan Error Batas Kapasitas:**
   * Jika pengepul mengklik "Terima" (`accept`) dan respon backend mengembalikan error status `400` dengan pesan: *"Anda telah mencapai batas maksimal pesanan aktif..."*, tampilkan pop-up pemberitahuan (Toast/Modal) agar pengepul mengetahui bahwa batas pesanan aktifnya sudah penuh dan harus menyelesaikan transaksi yang sedang berjalan terlebih dahulu.

### 3.3. Tampilan Riwayat & Digital Receipt
1. **Tampilan Itemized List:** Di halaman detail riwayat transaksi atau receipt digital, pastikan untuk me-looping array `items` (atau `detailsJson.items`) untuk menyajikan rincian terperinci (Nama Kategori, Estimasi Berat, Berat Aktual, Harga Final, Subtotal Harga, dan Catatan Catatan khusus).
