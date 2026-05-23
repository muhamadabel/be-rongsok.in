sequenceDiagram
    autonumber

    actor CUS as 👤 Customer
    participant FE  as 🖥️ Frontend\nNext.js
    participant BE  as ⚙️ Backend\nExpress.js
    participant DB  as 🗄️ Database\nPostgreSQL + PostGIS
    participant S3  as ☁️ Cloud Storage\nCloudinary / S3
    participant SIO as 🔌 Socket.IO\nServer
    actor PEG as 🏪 Pengepul\n(Multi-device)

    rect rgb(219, 234, 254)
        Note over CUS,FE: ── FASE A: Pengisian Form Pesanan ──
        CUS->>FE: Buka halaman buat pesanan
        FE-->>CUS: Render form pesanan
        CUS->>FE: Pilih kategori sampah\n(e.g., Kardus)
        CUS->>FE: Input estimasi berat (kg)
        CUS->>FE: Upload foto sampah\n(jpeg/png/webp, maks 5MB)
        CUS->>FE: Pilih metode (Jemput/Antar)
        CUS->>FE: Klik "Izinkan Lokasi"
        FE->>FE: navigator.geolocation.getCurrentPosition()
        FE-->>CUS: Koordinat GPS didapat\n{ lat, lng }
        CUS->>FE: Submit form pesanan
    end

    rect rgb(220, 252, 231)
        Note over FE,S3: ── FASE B: Upload Foto ke Cloud Storage ──
        FE->>S3: POST multipart/form-data\nUpload foto sampah
        S3-->>FE: 200 OK\n{ photo_url: "https://cdn.../foto.jpg" }
    end

    rect rgb(237, 233, 254)
        Note over FE,BE: ── FASE C: Kirim Request ke Backend ──
        FE->>BE: POST /api/orders\nAuthorization: Bearer JWT\nBody: { category_id, est_weight,\nphoto_url, lat, lng, method }
        BE->>BE: Verifikasi JWT token\nekstrak customer_id
        BE->>BE: Validasi payload request\n(express-validator / Zod)

        alt Validasi Gagal
            BE-->>FE: 422 Unprocessable Entity\n{ errors: [...field errors] }
            FE-->>CUS: Tampilkan pesan error validasi
        end
    end

    rect rgb(254, 243, 199)
        Note over BE,DB: ── FASE D: Spatial Query ke PostGIS ──
        BE->>DB: SELECT spatial query\nST_DWithin(collector.location,\nST_Point(lng, lat), radius_km * 1000)\nAND cp.is_open = true\nAND cc.category_id = :category_id\nAND cc.is_active = true\nORDER BY distance ASC
        Note right of DB: Index GIST aktif\npada kolom location\nuntuk performa optimal
        DB-->>BE: Resultset: Array<Collector>\n[ { collector_id, lapak_name,\ndistance_m, price_range,\nsocket_id } ]

        alt Tidak Ada Pengepul Ditemukan
            BE-->>FE: 404 Not Found\n{ message: "Tidak ada pengepul\naktif di sekitar lokasimu" }
            FE-->>CUS: Tampilkan notifikasi\n"Coba lagi nanti"
        end
    end

    rect rgb(254, 226, 226)
        Note over BE,DB: ── FASE E: Buat Record Order ──
        BE->>DB: INSERT INTO orders\n{ customer_id, category_id,\nphoto_url, estimated_weight,\nstatus: PENDING, method,\nlocation: ST_Point(lng,lat) }
        DB-->>BE: 201 Created\n{ order_id: "uuid-xxxx",\ncreated_at: timestamp }
        BE->>DB: INSERT INTO order_collectors\n(mapping order → kandidat pengepul)\n{ order_id, collector_id }[]
        DB-->>BE: Mapping tersimpan
    end

    rect rgb(209, 250, 229)
        Note over BE,PEG: ── FASE F: Broadcast Notifikasi Real-time ──
        BE->>SIO: emit("new_order", payload)\nke room: collector:{id}\nuntuk setiap kandidat pengepul
        Note right of SIO: Setiap Pengepul bergabung\nke room pribadi saat connect:\nsocket.join("collector:{id}")
        loop Untuk setiap Pengepul dalam radius
            SIO-->>PEG: Event: "new_order"\n{ order_id, category,\nest_weight, photo_url,\ncustomer_area, method,\nexpires_in: 900s }
            PEG-->>SIO: ACK diterima\n(socket acknowledgement)
        end
    end

    rect rgb(219, 234, 254)
        Note over BE,CUS: ── FASE G: Response ke Customer ──
        BE-->>FE: 201 Created\n{ order_id, status: PENDING,\nmatched_collectors_count,\nestimated_response_time }
        FE-->>CUS: Tampilkan halaman tracking\n"Menunggu konfirmasi pengepul..."\n⏳ Timer 15 menit aktif
    end