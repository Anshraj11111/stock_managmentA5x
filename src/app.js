import express from "express";
import cors from "cors";
import compression from "compression";
import { performanceLogger } from "./middlewares/performanceLogger.js";

import "./models/shopmodel.js";
import "./models/usermodel.js";
import "./models/productmodel.js";
import "./models/billmodel.js";
import "./models/billItemmodel.js";
import "./models/paymentmodel.js";
import "./models/adminmodel.js";

// import paymentRoutes from "./routes/paymentRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

import { apiLimiter, authLimiter } from "./middlewares/ratemiddleware.js";

const app = express();

/* ================= COMPRESSION ================= */
app.use(compression()); // Compress all responses

/* ================= PERFORMANCE LOGGING ================= */
app.use(performanceLogger); // Log slow requests

/* ================= CORS FIX ================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "https://stock-managmentfrontend.vercel.app",
  
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

/* ================= AUTH ================= */
app.use("/api/auth", authLimiter, authRoutes);

/* ================= ADMIN ROUTES ================= */
app.use("/api", adminRoutes);

/* ============== PROTECTED ROUTES ============== */
app.use("/api/shop", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/invoices", invoiceRoutes);
// app.use("/api/payment", paymentRoutes);

/* ============== RATE LIMITER LAST ============== */
app.use("/api", apiLimiter);

export default app;
