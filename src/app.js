import express from "express";
import cors from "cors";
import compression from "compression";
import helmet from "helmet";
import { performanceLogger } from "./middlewares/performanceLogger.js";

import authRoutes             from "./routes/authRoutes.js";
import productRoutes          from "./routes/productRoutes.js";
import staffRoutes            from "./routes/staffRoutes.js";
import shopRoutes             from "./routes/shopRoutes.js";
import billRoutes             from "./routes/billRoutes.js";
import reportRoutes           from "./routes/reportRoutes.js";
import invoiceRoutes          from "./routes/invoiceRoutes.js";
import adminRoutes            from "./routes/adminRoutes.js";
import customerRoutes         from "./routes/customerRoutes.js";
import subscriptionRoutes     from "./routes/subscriptionRoutes.js";
import adminSubscriptionRoutes from "./routes/adminSubscriptionRoutes.js";
import importRoutes           from "./routes/importRoutes.js";
import quotationRoutes        from "./routes/quotationRoutes.js";

import { apiLimiter, authLimiter } from "./middlewares/ratemiddleware.js";

const app = express();

// -- Security headers (helmet) -----------------------------------------------
app.use(helmet({
  contentSecurityPolicy:    false, // API only — no HTML served
  crossOriginEmbedderPolicy: false,
}));

// -- Additional security headers for Google OAuth ----------------------------
app.use((req, res, next) => {
  // Allow Google OAuth popup to communicate with parent window
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

// -- Compression (gzip) -------------------------------------------------------
app.use(compression({
  level:     6,
  threshold: 1024,
  filter: (req, res) => {
    const ct = res.getHeader('Content-Type') || '';
    if (typeof ct === 'string' && ct.includes('application/pdf')) return false;
    return compression.filter(req, res);
  },
}));

// -- Performance logger -------------------------------------------------------
app.use(performanceLogger);

// -- Short browser-cache for GET /api responses -------------------------------
app.use((req, res, next) => {
  if (req.method === 'GET' && req.path.startsWith('/api')) {
    res.setHeader('Cache-Control', 'private, max-age=5');
  }
  next();
});

// -- CORS ---------------------------------------------------------------------
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
    if (
      allowedOrigins.includes(origin) ||
      /^https:\/\/.*\.vercel\.app$/.test(origin)
    ) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));

// -- Body parser --------------------------------------------------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// -- Global rate limiter BEFORE routes (was registered after — never applied) -
app.use("/api", apiLimiter);

// -- Health check (no auth) ---------------------------------------------------
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// -- Auth routes (stricter limiter overrides the global one) ------------------
app.use("/api/auth",  authLimiter, authRoutes);

// -- Admin routes -------------------------------------------------------------
app.use("/api",       adminRoutes);
app.use("/api/admin", adminSubscriptionRoutes);

// -- Protected user routes ----------------------------------------------------
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

// -- Global error handler -----------------------------------------------------
app.use((err, req, res, next) => {
  console.error(`Unhandled error [${req.method} ${req.path}]:`, err.message);
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message,
  });
});

export default app;
