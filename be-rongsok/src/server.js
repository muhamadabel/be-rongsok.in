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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api/v1`);
  console.log(`📖 Swagger UI Docs: http://localhost:${PORT}/api-docs`);
});
