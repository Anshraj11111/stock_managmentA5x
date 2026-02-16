import express from "express";
import cors from "cors";

import "./models/shopmodel.js";
import "./models/usermodel.js";
import "./models/productmodel.js";
import "./models/billmodel.js";
import "./models/billItemmodel.js";
import "./models/paymentmodel.js";

import authRoutes from "./routes/authRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import staffRoutes from "./routes/staffRoutes.js";
import shopRoutes from "./routes/shopRoutes.js";
import billRoutes from "./routes/billRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import invoiceRoutes from "./routes/invoiceRoutes.js";

import { apiLimiter, authLimiter } from "./middlewares/ratemiddleware.js";

const app = express();

/* ================= CORS FIX ================= */

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://stock-managementfrontend.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true); // allow Postman etc

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

/* ================= AUTH ================= */
app.use("/api/auth", authLimiter);
app.use("/api/auth", authRoutes);

/* ============== PROTECTED ROUTES ============== */
app.use("/api/shop", shopRoutes);
app.use("/api/products", productRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/bills", billRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/invoices", invoiceRoutes);

/* ============== RATE LIMITER LAST ============== */
app.use("/api", apiLimiter);

export default app;
