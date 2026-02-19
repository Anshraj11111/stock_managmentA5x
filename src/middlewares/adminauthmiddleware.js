import jwt from "jsonwebtoken";
import Admin from "../models/adminmodel.js";

export const adminAuthMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false,
        message: "No token provided" 
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token using ADMIN_JWT_SECRET
    const decoded = jwt.verify(token, process.env.ADMIN_JWT_SECRET);
    
    // Find admin by ID
    const admin = await Admin.findByPk(decoded.admin_id);
    
    if (!admin) {
      return res.status(401).json({ 
        success: false,
        message: "Admin not found" 
      });
    }
    
    // Check if admin is active
    if (!admin.is_active) {
      return res.status(403).json({ 
        success: false,
        message: "Admin account is inactive" 
      });
    }
    
    // Attach admin to request object
    req.admin = {
      admin_id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role
    };
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false,
        message: "Invalid token" 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: "Token expired" 
      });
    }
    
    return res.status(500).json({ 
      success: false,
      message: "Authentication error",
      error: error.message 
    });
  }
};
