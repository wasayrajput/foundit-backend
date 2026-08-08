const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const seedAdmins = require('./config/seedAdmin');

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Connect Database & Seed Admins in non-serverless mode
if (!process.env.VERCEL) {
  connectDB().then(() => {
    seedAdmins();
  });
} else {
  app.use(async (req, res, next) => {
    try {
      if (process.env.MONGO_URI) {
        await connectDB();
      }
    } catch (_) {}
    next();
  });
}

// Initialize Socket.io WebSockets in non-serverless mode
if (!process.env.VERCEL) {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  });
  io.on('connection', (socket) => {
    console.log(`⚡ WebSocket Client Connected: ${socket.id}`);
    socket.on('disconnect', () => {
      console.log(`🔌 WebSocket Client Disconnected: ${socket.id}`);
    });
  });
  app.set('io', io);
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve static images from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const postRoutes = require('./routes/postRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Health Check API Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Foundit API & WebSocket Server is running smoothly!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

// Start Server
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Foundit Backend Server running on http://0.0.0.0:${PORT}`);
    console.log(`📡 Health Check URL: http://localhost:${PORT}/api/health`);
  });
}

module.exports = app;
