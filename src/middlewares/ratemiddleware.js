import rateLimit from "express-rate-limit";

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // 300 requests per IP
  message: {
    message: "Too many requests, please try again later",
  },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100, // ✅ Increased for testing
  message: {
    message: "Too many login attempts, slow down",
  },
  skipSuccessfulRequests: true, // ✅ Don't count successful logins
});
