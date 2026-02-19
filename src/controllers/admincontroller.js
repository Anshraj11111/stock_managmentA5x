import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Admin from "../models/adminmodel.js";
import User from "../models/usermodel.js";
import Shop from "../models/shopmodel.js";
import Product from "../models/productmodel.js";
import Payment from "../models/paymentmodel.js";
import { Op } from "sequelize";
import sequelize from "../config/database.js";

// Fixed admin code
const ADMIN_CODE = "H5";

// Generate JWT token for admin
const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      admin_id: admin.id,
      email: admin.email,
      role: admin.role
    },
    process.env.ADMIN_JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// Validate admin code
const validateAdminCode = (code) => {
  if (code !== ADMIN_CODE) {
    throw new Error("Invalid admin code");
  }
};

/**
 * ======================================
 * ADMIN SIGNUP
 * ======================================
 */
export const adminSignup = async (req, res) => {
  try {
    const { name, email, password, admin_code } = req.body;

    // Validate required fields
    if (!name || !email || !password || !admin_code) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Validate admin code
    try {
      validateAdminCode(admin_code);
    } catch (error) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin code"
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ where: { email } });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: "Admin with this email already exists"
      });
    }

    // Hash password (8 rounds for performance)
    const hashedPassword = await bcrypt.hash(password, 8);

    // Create admin
    const admin = await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "support_admin", // Default role
      is_active: true
    });

    // Generate token
    const token = generateAdminToken(admin);

    res.status(201).json({
      success: true,
      message: "Admin created successfully",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Admin signup error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create admin",
      error: error.message
    });
  }
};

/**
 * ======================================
 * ADMIN LOGIN
 * ======================================
 */
