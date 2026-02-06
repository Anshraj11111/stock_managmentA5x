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

import { apiLimiter,authLimiter } from "./middlewares/ratemiddleware.js";


const app = express();

// Middlewares
app.use(cors());
app.use(express.json());

//routes
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api", apiLimiter);
app.use("/api/auth", authLimiter);
app.use("/api/shop",shopRoutes);
app.use("/api/bills", billRoutes); 
app.use("/api/reports", reportRoutes); 
app.use("/api/invoices", invoiceRoutes);



export default app;