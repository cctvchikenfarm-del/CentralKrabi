const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const entriesRoutes = require('./routes/entries');
const dashboardRoutes = require('./routes/dashboard');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const importsRoutes = require('./routes/imports');
const usersRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const { errorHandler } = require('./middleware/errors');

const app = express();

// ── Security ──────────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: false, // managed by Vite dev proxy
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// ── CORS ──────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:4173').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin) || origin.endsWith('.onrender.com')) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));

// ── Body / Cookie parsing ─────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api', entriesRoutes);
app.use('/api', dashboardRoutes);
app.use('/api', analyticsRoutes);
app.use('/api', reportsRoutes);
app.use('/api', importsRoutes);
app.use('/api', usersRoutes);
app.use('/api', adminRoutes);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    version: '4.0.0',
    release: 'CKAP_v4.0_GREENFIELD',
    timestamp: new Date().toISOString(),
  });
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use(errorHandler);

module.exports = app;
