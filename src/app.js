import express from "express";
import cors from "cors";
import compression from "compression";
import { performanceLogger } from "./middlewares/performanceLogger.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import customerRoutes from "./routes/customerRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import adminSubscriptionRoutes from "./routes/adminSubscriptionRoutes.js";
import importRoutes from "./routes/importRoutes.js";
import quotationRoutes from "./routes/quotationRoutes.js";

import { apiLimiter, authLimiter } from "./middlewares/ratemiddleware.js";

const app = express();

/* ── Compression (gzip/brotli) ─────────────────────────────────────────── */
app.use(compression({
  level:  6,       // 1–9, 6 = good balance of speed vs size
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    // Don't compress PDF/image responses
    const ct = res.getHeader('Content-Type') || '';
    if (typeof ct === 'string' && ct.includes('application/pdf')) return false;
    return compression.filter(req, res);
  },
}));

/* ── Performance logger (fixed double-log) ─────────────────────────────── */
app.use(performanceLogger);

/* ── Security headers ───────────────────────────────────────────────────── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  // Allow caching of GET API responses for 5s by browser (avoids redundant refetches)
  if (req.method === 'GET' && req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'private, max-age=5');
  }
  next();
});

/* ── CORS ───────────────────────────────────────────────────────────────── */
const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:5173",
  "http://localhost:5174",
  "https://stock-managmentfrontend.vercel.app",
  "https://stock-managment-frontend.vercel.app",
  "https://stocksaas.a5x.in",
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

/* ── Body parser (limit set to avoid large payload abuse) ──────────────── */
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* ── Health check (no auth, instant response) ──────────────────────────── */
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

/* ── Auth routes ────────────────────────────────────────────────────────── */
app.use("/api/auth", authLimiter, authRoutes);

/* ── Admin routes ───────────────────────────────────────────────────────── */
app.use("/api", adminRoutes);
app.use("/api/admin", adminSubscriptionRoutes);

/* ── Protected routes ───────────────────────────────────────────────────── */
app.use("/api/shop",         shopRoutes);
app.use("/api/products",     productRoutes);
app.use("/api/staff",        staffRoutes);
app.use("/api/bills",        billRoutes);
app.use("/api/reports",      reportRoutes);
app.use("/api/invoices",     invoiceRoutes);
app.use("/api/customers",    customerRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/import",       importRoutes);
app.use("/api/quotations",   quotationRoutes);

/* ── Global rate limiter (last) ─────────────────────────────────────────── */
app.use("/api", apiLimiter);

/* ── Global error handler ───────────────────────────────────────────────── */
app.use((err, req, res, next) => {
  console.error(`❌ Unhandled error [${req.method} ${req.path}]:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

export default app;
