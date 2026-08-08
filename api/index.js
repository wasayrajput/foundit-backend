const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('../config/db');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to MongoDB Atlas if MONGO_URI environment variable is present
app.use(async (req, res, next) => {
  if (process.env.MONGO_URI) {
    try {
      await connectDB();
    } catch (_) {}
  }
  next();
});

const authRoutes = require('../routes/authRoutes');
const uploadRoutes = require('../routes/uploadRoutes');
const postRoutes = require('../routes/postRoutes');
const userRoutes = require('../routes/userRoutes');
const adminRoutes = require('../routes/adminRoutes');
const notificationRoutes = require('../routes/notificationRoutes');

// Health Check API Route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Foundit API Server is running smoothly on Vercel!',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);

module.exports = app;
