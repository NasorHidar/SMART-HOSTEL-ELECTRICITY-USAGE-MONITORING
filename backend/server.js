// ─── Load Environment Variables ────────────────────────────────────────────────
// MUST be the very first statement so process.env is populated before any
// module import or validation reads from it.
require('dotenv').config();

// ─── Environment Validation ───────────────────────────────────────────────────
const requiredEnv = [
  'MONGO_URI',
  'JWT_SECRET',
  'SSL_STORE_ID',
  'SSL_STORE_PASSWORD',
  'DEVICE_SECRET',
  'ADMIN_SECRET',    // C3 FIX: required for registration endpoint protection
];

const missingEnv = requiredEnv.filter((envVar) => !process.env[envVar]);

if (missingEnv.length > 0) {
  console.error('\n❌ FATAL ERROR: Missing required environment variables:');
  missingEnv.forEach((envVar) => console.error(`   - ${envVar}`));
  console.error('\nPlease check your .env file and try again. See .env.example for reference.\n');
  process.exit(1);
}

const express = require('express');
const cors    = require('cors');

const http = require('http');
const connectDB = require('./config/db');
const authRoutes            = require('./routes/authRoutes');
const readingRoutes         = require('./routes/readingRoutes');
const paymentRoutes         = require('./routes/paymentRoutes');
const carbonRoutes          = require('./routes/carbonRoutes');
const usagePredictionRoutes = require('./routes/usagePredictionRoutes');
const { initSocket }                  = require('./services/socketService');
const { startAnomalyDetectionCron }   = require('./services/geminiService');
const { startSustainabilityInsightCron } = require('./services/sustainabilityInsightService');
const { startDailyReportCron }        = require('./services/cronService');

// ─── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ─── Express App ──────────────────────────────────────────────────────────────
const app = express();

// Allow requests from the React dev server (port 5173) and production build
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, Postman, ESP32)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS blocked: ${origin}`));
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ─── Request Logger (dev only) ────────────────────────────────────────────────
if (process.env.NODE_ENV === 'development') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', authRoutes);
app.use('/api', readingRoutes);
app.use('/api', paymentRoutes);
app.use('/api', carbonRoutes);
app.use('/api', usagePredictionRoutes);

// ─── 404 Handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err, _req, res, _next) => {
  console.error('[Server] Unhandled error:', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

// ─── Start Server ─────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

server.listen(PORT, () => {
  console.log(`\n🚀 Smart Meter API running on http://localhost:${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV}`);
  console.log(`   MongoDB     : ${process.env.MONGO_URI}\n`);

  // Start Gemini anomaly detection cron (every 5 minutes)
  startAnomalyDetectionCron();

  // Start daily sustainability insight cron (every day at 23:55)
  startSustainabilityInsightCron();

  // Start daily PDF report email cron (every day at midnight)
  startDailyReportCron();
});

module.exports = server;