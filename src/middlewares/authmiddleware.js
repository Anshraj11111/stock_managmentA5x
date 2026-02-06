import jwt from "jsonwebtoken";

const authMiddleware = (req, res, next) => {
  try {
    // Header se token uthao
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    // Format: Bearer TOKEN
    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // req.user me attach
    req.user = {
      user_id: decoded.user_id,
      role: decoded.role,
      shop_id: decoded.shop_id,
    };

    next(); // 🚀 allow request
  } catch (error) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export default authMiddleware;