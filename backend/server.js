import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import drawingRoutes from './routes/drawingRoutes.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

// Global uncaught exception and unhandled rejection logging
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

// Verify mandatory environment variables
if (!process.env.JWT_SECRET) {
  console.error('❌ FATAL ERROR: JWT_SECRET is not defined in environment variables.');
  process.exit(1);
}

// Connect to MongoDB
connectDB();

const app = express();

// Trust reverse proxy (Render, Vercel, etc.) for rate limiting and secure cookies
app.set('trust proxy', 1);

// Security headers with Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS — allow frontend with credentials (cookies)
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Parse cookies
app.use(cookieParser());

// Parse JSON bodies (15MB limit for base64 image data)
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Health check endpoint (includes DB connection state)
app.get('/api/health', (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const readyState = mongoose.connection.readyState;
  res.json({
    success: true,
    message: 'AI Air Drawing API is running',
    database: {
      status: dbStateMap[readyState] || 'unknown',
      readyState,
    },
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/drawings', drawingRoutes);

// Error handling
app.use(notFound);
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
