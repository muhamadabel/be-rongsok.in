const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const authRoutes = require('./routes/auth');
const collectorRoutes = require('./routes/collector');
const discoveryRoutes = require('./routes/discovery');
const orderRoutes = require('./routes/order');
const ratingRoutes = require('./routes/rating');
const adminRoutes = require('./routes/admin');
const uploadRoutes = require('./routes/upload');
const { errorHandler } = require('./middlewares/error');
const prisma = require('./config/prisma');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE']
  }
});

// Middlewares
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Socket.IO Logic
app.set('io', io); // Simpan io di instance app agar bisa diakses di controller
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join_room', (roomId) => {
    socket.join(roomId);
    console.log(`User joined room: ${roomId}`);
  });

  // Live tracking: relay posisi pihak yang sedang menuju lokasi ke lawan transaksi.
  // payload: { orderId, lat, lng, role }. Dikirim ke room order:<orderId> kecuali pengirim.
  socket.on('location_update', (payload) => {
    if (payload && payload.orderId) {
      socket.to(`order:${payload.orderId}`).emit('location_update', payload);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Rongsok.in API is running' });
});

// Swagger UI
const swaggerDocument = YAML.load(path.join(__dirname, '../docs/swagger.yaml'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/collector', collectorRoutes);
app.use('/api/v1/discovery', discoveryRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/ratings', ratingRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/upload', uploadRoutes);

// Error Handling Middleware
app.use(errorHandler);

// Auto-batalkan order "ON_THE_WAY" yang lebih dari 3 jam tak kunjung ditandai
// sampai (arrive). Disapu berkala (bukan lazy-on-read) supaya tetap kena
// walau tak ada pihak yang membuka halaman order tsb.
const ON_THE_WAY_TIMEOUT_MS = 3 * 60 * 60 * 1000; // 3 jam
// Tawaran WAR (broadcast) berlaku 15 menit sejak dibuat — sama dengan countdown
// yang ditampilkan FE di dasbor pengepul (OFFER_TTL_MS). Dulu cuma efek visual:
// order disaring dari tampilan pengepul tapi baris di DB tetap PENDING selamanya,
// jadi customer nunggu tanpa batas. Sekarang beneran di-CANCELLED di server.
const WAR_OFFER_TIMEOUT_MS = 15 * 60 * 1000; // 15 menit
const AUTO_CANCEL_SWEEP_MS = 60 * 1000; // cek tiap 1 menit

async function sweepStaleOnTheWayOrders() {
  try {
    const staleBefore = new Date(Date.now() - ON_THE_WAY_TIMEOUT_MS);
    const stale = await prisma.order.findMany({
      where: { status: 'ON_THE_WAY', updatedAt: { lt: staleBefore } },
      select: { id: true, customerId: true, collectorId: true }
    });
    for (const o of stale) {
      await prisma.order.update({ where: { id: o.id }, data: { status: 'CANCELLED' } });
      io.to(`order:${o.id}`).emit('order_status_update', { orderId: o.id, status: 'CANCELLED' });
      console.log(`⏰ Auto-batalkan order ${o.id} — lebih dari 3 jam dalam perjalanan tanpa "sudah sampai".`);
    }
  } catch (err) {
    console.error('Gagal menyapu order ON_THE_WAY basi:', err.message);
  }
}

async function sweepExpiredWarOrders() {
  try {
    const staleBefore = new Date(Date.now() - WAR_OFFER_TIMEOUT_MS);
    // War/broadcast = PENDING & belum ber-collector (collectorId null). Order
    // "forward" (private, collectorId sudah terisi) TIDAK kena — customer sengaja
    // menunggu satu lapak tertentu, jadi tak ada batas 15 menit.
    const stale = await prisma.order.findMany({
      where: { status: 'PENDING', collectorId: null, createdAt: { lt: staleBefore } },
      select: { id: true }
    });
    for (const o of stale) {
      const notified = await prisma.orderCollector.findMany({
        where: { orderId: o.id },
        select: { collectorId: true }
      });
      await prisma.order.update({ where: { id: o.id }, data: { status: 'CANCELLED' } });
      io.to(`order:${o.id}`).emit('order_status_update', { orderId: o.id, status: 'CANCELLED' });
      // Bersihkan antrean SEMUA pengepul yang sempat dinotifikasi — sama seperti
      // saat accept/cancel manual — supaya hilang instan meski jam client beda.
      notified.forEach((c) => {
        io.to(`collector:${c.collectorId}`).emit('order_taken', { orderId: o.id });
      });
      console.log(`⏰ Auto-batalkan order ${o.id} — 15 menit war/broadcast tanpa pengepul yang menerima.`);
    }
  } catch (err) {
    console.error('Gagal menyapu order war basi:', err.message);
  }
}

setInterval(() => {
  sweepStaleOnTheWayOrders();
  sweepExpiredWarOrders();
}, AUTO_CANCEL_SWEEP_MS);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`📖 Swagger UI Docs: http://localhost:${PORT}/api-docs`);
});
