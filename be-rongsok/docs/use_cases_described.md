# Penjelasan Detail Use Case Diagram — Platform Rongsok.in
Platform **Rongsok.in** membagi hak akses dan fungsionalitas sistem berdasarkan tiga aktor utama: **Customer (Penghasil Sampah)**, **Pengepul (Lapak/Gudang)**, dan **Admin (Tim Internal)**. Berikut adalah penjelasan terperinci disertai diagram untuk masing-masing peran.

---

## 1. Customer Use Case (Aktivitas Penghasil Sampah)

![Customer Use Case Diagram](file:///Users/mrfrog/Documents/Lomba/OLIVIA/plan/be-rongsok/docs/use case/customer_use case.png)

### Penjelasan Paragraph untuk Setiap Use Case:

* **UC-01: Registrasi Akun (Customer)**
  Proses registrasi akun baru merupakan langkah awal bagi pengguna publik untuk mendaftarkan diri ke platform Rongsok.in dengan memasukkan nama, alamat email aktif, nomor telepon WhatsApp, dan kata sandi yang aman. Sistem memaksa pengguna memilih peran secara permanen sebagai "Customer" guna mengunci tampilan antarmuka pencarian sampah daur ulang sejak pertama kali masuk.

* **UC-02: Pilih Peran (Customer/Pengepul)**
  Fungsionalitas ini terintegrasi erat (`<<include>>`) dengan proses registrasi akun, di mana calon pengguna wajib menentukan perannya untuk memastikan hak akses data dan alur kerja aplikasi terkonfigurasi dengan benar di database.

* **UC-03: Login & Sesi JWT**
  Sistem autentikasi menggunakan email dan kata sandi yang telah terdaftar untuk menerbitkan JSON Web Token (JWT) yang disimpan di HTTP-only cookie. Protokol ini menjamin perlindungan privasi data pengguna dan memungkinkan komunikasi stateless yang aman dengan backend API.

* **UC-04: Kelola Profil & Avatar**
  Customer dapat mengedit data personal mereka seperti mengubah nama tampilan, memperbarui nomor WhatsApp yang aktif untuk koordinasi transaksi, serta mengganti foto avatar profil yang disimpan secara terpusat pada media penyimpanan Cloudinary.

* **UC-06: Deteksi Lokasi Spasial (GPS)**
  Use case ini memanfaatkan HTML5 Geolocation API di peramban guna mendeteksi koordinat garis lintang (latitude) dan bujur (longitude) dari perangkat pengguna secara presisi. Koordinat ini menjadi dasar penting bagi penentuan titik jemput maupun perhitungan jarak terdekat ke pengepul.

* **UC-07: Cari Pengepul Terdekat (Radius Spasial PostGIS)**
  Customer dapat mencari pengepul aktif di sekitarnya menggunakan pencarian berbasis spasial. Backend memanfaatkan ekstensi PostGIS (tabel PostgreSQL) dengan fungsi `ST_DWithin` untuk menyaring pengepul dalam radius jangkauan operasional dan mengurutkannya dari yang terdekat.

* **UC-08: Filter Kategori Sampah**
  Fungsionalitas penyaringan ini memperluas (`<<extend>>`) fitur pencarian utama, memungkinkan Customer untuk memilah daftar pengepul hanya yang bersedia membeli kategori sampah tertentu, seperti kardus bekas, botol plastik PET, kertas koran, atau logam besi.

* **UC-09: Lihat Detail & Katalog Lapak**
  Sebelum mengajukan pesanan, Customer dapat meninjau profil lengkap pengepul pilihan mereka yang memuat informasi jam operasional, rating reputasi dari transaksi sebelumnya, deskripsi fasilitas, serta daftar katalog harga beli (Min-Max) per kilogram untuk tiap jenis sampah.

* **UC-10: Visualisasi Lapak pada Peta (Leaflet.js)**
  Use case ini memperluas (`<<extend>>`) visualisasi hasil pencarian dengan menampilkan titik-titik lokasi lapak pengepul secara interaktif menggunakan Leaflet.js dengan peta dasar dari OpenStreetMap, sehingga memudahkan Customer memahami posisi spasial para pengepul di sekitarnya.

* **UC-13: Buat Pesanan (Jemput / Antar)**
  Customer dapat membuat permintaan transaksi dengan mengisi formulir pemesanan, memilih apakah sampah ingin dijemput oleh pengepul ke alamat kos/rumah (pick-up) atau diantarkan langsung secara mandiri ke lapak tujuan (drop-off).

* **UC-14: Unggah Foto Sampah & Estimasi Berat**
  Use case ini merupakan bagian wajib (`<<include>>`) saat pembuatan pesanan, di mana Customer harus mengunggah foto kondisi fisik tumpukan sampah daur ulang mereka ke Cloudinary serta menginput estimasi berat (dalam kilogram) sebagai referensi awal bagi pengepul.

* **UC-18: Negosiasi / Koreksi Harga**
  Ketika pengepul telah selesai menimbang sampah di lokasi dan mengajukan harga final, Customer dapat menggunakan fitur ini jika merasa nominal tersebut kurang sesuai untuk bernegosiasi secara manual atau meminta pengepul mengoreksi timbangan sebelum transaksi ditutup.

* **UC-19: Konfirmasi Pesanan Selesai**
  Use case ini merupakan tanda kesepakatan akhir di mana Customer mengklik tombol "Setuju" atas berat aktual dan nominal harga yang diajukan pengepul, yang secara otomatis mengubah status transaksi menjadi `COMPLETED` dan mengunci data keuangan.

* **UC-20: Akses Struk Digital & Riwayat Transaksi**
  Setelah transaksi sukses dinyatakan selesai (`<<include>>`), sistem secara otomatis menerbitkan struk digital (digital receipt) berisi rekapitulasi data final transaksi (tanggal, ID, detail kategori sampah, berat timbangan, total uang) yang dapat diakses kembali kapan pun lewat menu riwayat.

* **UC-21: Berikan Rating & Foto Ulasan ke Pengepul**
  Fitur umpan balik ini memperluas (`<<extend>>`) proses penyelesaian pesanan, memberikan hak kepada Customer untuk menilai kinerja pengepul (kejujuran timbangan, keramahan, dan ketepatan waktu) berupa skor bintang 1-5 dan ulasan tekstual serta foto.

---

## 2. Pengepul Use Case (Aktivitas Lapak / Gudang)

![Collector Use Case Diagram](file:///Users/mrfrog/Documents/Lomba/OLIVIA/plan/be-rongsok/docs/use case/collector_use case.png)

### Penjelasan Paragraph untuk Setiap Use Case:

* **UC-01: Registrasi Akun (Pengepul)**
  Mekanisme pendaftaran akun khusus bagi mitra pengepul daur ulang dengan melampirkan informasi dasar akun. Setelah registrasi awal berhasil, sistem akan mengidentifikasi peran sebagai Pengepul dan langsung mengarahkannya untuk melengkapi profil lapak fisik sebelum bisa aktif menerima pesanan.

* **UC-03: Login & Sesi JWT**
  Sistem memverifikasi kredensial email dan kata sandi pengepul, lalu menerbitkan JWT aman sebagai token otorisasi berumur terbatas agar pengepul dapat berinteraksi dengan API tertutup Rongsok.in.

* **UC-04: Kelola Profil & Avatar**
  Pengepul dapat memperbarui profil personal mereka seperti foto profil, nama lengkap, serta kontak telepon operasional yang terhubung langsung ke WhatsApp sebagai jalur komunikasi eksternal utama dengan Customer.

* **UC-05: Lengkapi Profil & Foto Lapak**
  Fitur wajib pasca-registrasi (`<<extend>>`) yang memungkinkan Pengepul mengisi data lapak fisik mencakup nama lapak/gudang, radius layanan operasional (dalam km), mengunggah foto gudang, serta mengaktifkan status buka/tutup lapak di peta digital.

* **UC-11: Atur Katalog Harga & Kategori Sampah**
  Pengepul memiliki kendali penuh untuk mengelola daftar kategori sampah yang mereka terima berdasarkan data master. Pengepul dapat menyetel rentang harga beli minimum dan maksimum per kilogram untuk menjaga transparansi nilai tawar kepada calon Customer.

* **UC-15: Terima Notifikasi Pesanan Real-time (Socket.IO)**
  Melalui koneksi Socket.IO yang terjalin terus-menerus, Pengepul akan mendapatkan alarm visual dan suara di layar smartphone secara real-time apabila ada pesanan Customer terdekat masuk dalam radius jangkauan lapak mereka.

* **UC-16: Terima / Tolak Order**
  Pengepul memiliki waktu maksimal 15 menit untuk meninjau detail pesanan (foto sampah, alamat, estimasi berat) dan memutuskan untuk menerimanya (`CONFIRMED`) atau menolak pesanan tersebut agar dilempar ke pengepul lain sebelum otomatis dibatalkan sistem.

* **UC-17: Input Berat Aktual & Bukti Foto Timbangan**
  Setelah tiba di lokasi Customer dan melakukan pengukuran berat secara fisik, Pengepul wajib menginput angka timbangan aktual (kg) ke sistem serta mengunggah foto bukti timbangan nyata atau nota digital sebagai jaminan kejujuran transaksi.

* **UC-20: Akses Struk Digital & Riwayat Transaksi**
  Sama seperti Customer, Pengepul dapat membuka arsip riwayat transaksi masa lalu mereka untuk memantau performa bisnis, total omzet, volume sampah yang dikumpulkan, serta mengunduh struk digital resmi yang diterbitkan oleh sistem.

* **UC-22: Berikan Rating Kualitas Sampah Customer**
  Guna membangun ekosistem yang sehat, Pengepul memiliki hak memperluas (`<<extend>>`) transaksi akhir dengan memberikan rating bintang 1-5 kepada Customer untuk menilai kebersihan sampah (tidak basah/berbau busuk) serta kesesuaian deskripsi awal.

---

## 3. Admin Use Case (Aktivitas Tim Pengelola)

![Admin Use Case Diagram](file:///Users/mrfrog/Documents/Lomba/OLIVIA/plan/be-rongsok/docs/use case/admin_use case.png)

### Penjelasan Paragraph untuk Setiap Use Case:

* **UC-03: Login & Sesi JWT**
  Proses otentikasi khusus bagi akun dengan peran (role) Admin menggunakan panel masuk internal untuk memperoleh token akses administratif tingkat tinggi yang divalidasi ketat oleh sistem keamanan backend.

* **UC-12: Kelola Data Master Kategori Sampah**
  Admin bertanggung jawab penuh untuk mengelola master data kategori sampah di dalam database (seperti menambah jenis sampah baru, memperbarui ikon kategori, atau menonaktifkan kategori yang tidak relevan) yang nantinya diakses oleh seluruh Pengepul untuk katalog harga mereka.

* **UC-23: Monitoring Seluruh Transaksi Platform**
  Admin memiliki akses eksklusif ke dashboard pemantauan menyeluruh untuk mengawasi status semua transaksi berjalan, menganalisis grafik volume daur ulang kota, serta menengahi sengketa (dispute) jika terjadi perselisihan rating atau ketidakjujuran timbangan antar pengguna.
