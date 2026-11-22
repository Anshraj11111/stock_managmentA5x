import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/usermodel.js";
import Shop from "../models/shopmodel.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generate access + refresh token pair
 * Access token: 7 days (was 30d — shorter window limits damage if stolen)
 * Refresh token: 30 days — used only for silent re-auth
 */
const generateTokens = (payload) => {
  const accessToken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "7d" });
  const refreshToken = jwt.sign(
    { user_id: payload.user_id, shop_id: payload.shop_id },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh",
    { expiresIn: "30d" }
  );
  return { accessToken, refreshToken };
};

/**
 * Password strength validator
 * Min 8 chars, at least one letter and one number
 */
const validatePassword = (password) => {
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters";
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }
  return null; // valid
};

/**
 * Shared shop status checker — returns { trialExpired, subscriptionExpired, warningMessage }
 */
const checkShopStatus = (shop) => {
  let trialExpired = false;
  let subscriptionExpired = false;
  let warningMessage = '';

  if (!shop) return { trialExpired, subscriptionExpired, warningMessage };

  if (shop.isSuspended) return { suspended: true };

  const today = new Date();

  if ((shop.subscription_plan === 'trial' || !shop.subscription_plan) && shop.trial_end_date) {
    const trialEndDate = new Date(shop.trial_end_date);
    if (trialEndDate < today && !shop.deposit_paid) {
      trialExpired = true;
      warningMessage = "Trial expired. Please pay ₹100 deposit to continue. Contact: +91-8269858259";
    }
  }

  if (shop.subscription_end_date) {
    const endDate = new Date(shop.subscription_end_date);
    if (endDate < today) {
      subscriptionExpired = true;
      warningMessage = "Subscription expired. Please renew. Contact: +91-8269858259";
    }
  }

  return { trialExpired, subscriptionExpired, warningMessage };
};

// ── Controllers ───────────────────────────────────────────────────────────────

/**
 * OWNER SIGNUP
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, shop_name, category, owner_phone, address } = req.body;

    // Basic field validation
    if (!name || !email || !password || !shop_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // ✅ FIX 3: Password strength validation
    const passwordError = validatePassword(password);
    if (passwordError) {
      return res.status(400).json({ message: passwordError });
    }

    const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (exists) {
      return res.status(400).json({ message: "An account with this email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const today = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(today.getDate() + 31);

    const shop = await Shop.create({
      shop_name: shop_name.trim(),
      category,
      owner_phone: owner_phone || '',
      address: address || '',
      trial_start_date: today,
      trial_end_date: trialEnd,
      subscription_active: false,
      plan_type: "trial",
      subscription_plan: "trial",
    });

    const owner = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "owner",
      shop_id: shop.id,
      isActive: true,
    });

    // ✅ FIX 4: Use 7-day access token + refresh token
    const tokenPayload = { user_id: owner.id, name: owner.name, role: owner.role, shop_id: shop.id };
    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    res.status(201).json({
      success: true,
      message: "Signup successful",
      token: accessToken,
      refreshToken,
      plan_type: "trial",
    });

  } catch (error) {
    console.error("Signup error:", error.message);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Signup failed' : error.message,
    });
  }
};

/**
 * LOGIN (OWNER + STAFF)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ where: { email: email.toLowerCase().trim() } });

    // ✅ FIX 2: Don't reveal whether email exists — use generic message for both cases
    // Always run bcrypt to prevent timing attacks
    const dummyHash = "$2b$10$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012345";
    const isMatch = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash); // Constant-time dummy compare

    if (!user || !isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const shop = await Shop.findByPk(user.shop_id);
    const status = checkShopStatus(shop);

    if (status.suspended) {
      return res.status(403).json({
        message: shop.suspension_reason || "Your account has been suspended. Contact: +91-8269858259",
        suspended: true,
      });
    }

    // ✅ FIX 4: 7-day access + 30-day refresh token
    const tokenPayload = { user_id: user.id, name: user.name, role: user.role, shop_id: user.shop_id };
    const { accessToken, refreshToken } = generateTokens(tokenPayload);

    res.json({
      success: true,
      message: "Login successful",
      token: accessToken,
      refreshToken,
      trialExpired: status.trialExpired,
      subscriptionExpired: status.subscriptionExpired,
      warningMessage: status.warningMessage,
      action_required: status.trialExpired ? 'deposit' : (status.subscriptionExpired ? 'renewal' : null),
    });

  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Login failed' : error.message,
    });
  }
};

/**
 * REFRESH TOKEN — get new access token using refresh token
 */
export const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({ message: "Refresh token required" });
    }

    const refreshSecret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + "_refresh";
    let decoded;
    try {
      decoded = jwt.verify(token, refreshSecret);
    } catch {
      return res.status(401).json({ message: "Invalid or expired refresh token" });
    }

    const user = await User.findByPk(decoded.user_id);
    if (!user || !user.isActive) {
      return res.status(401).json({ message: "User not found or inactive" });
    }

    const tokenPayload = { user_id: user.id, name: user.name, role: user.role, shop_id: user.shop_id };
    const { accessToken, refreshToken: newRefreshToken } = generateTokens(tokenPayload);

    res.json({
      success: true,
      token: accessToken,
      refreshToken: newRefreshToken,
    });

  } catch (error) {
    console.error("Refresh token error:", error.message);
    res.status(500).json({ error: 'Token refresh failed' });
  }
};

/**
 * GOOGLE OAUTH LOGIN/SIGNUP
 */
export const googleAuth = async (req, res) => {
  try {
    const { credential, shop_data } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google credential is required" });
    }

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error("❌ GOOGLE_CLIENT_ID missing in ENV");
      return res.status(500).json({ message: "Server configuration error" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: google_id, email, name } = payload;

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ where: { email: normalizedEmail } });

    if (user) {
      // ── Existing user — LOGIN ────────────────────────────────────────────
      if (!user.google_id) {
        await user.update({ google_id, auth_provider: "google" });
      }

      const shop = await Shop.findByPk(user.shop_id);
      const status = checkShopStatus(shop);

      if (status.suspended) {
        return res.status(403).json({
          message: shop.suspension_reason || "Your account has been suspended. Contact: +91-8269858259",
          suspended: true,
        });
      }

      const tokenPayload = { user_id: user.id, name: user.name, role: user.role, shop_id: user.shop_id };
      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      return res.json({
        success: true,
        message: "Login successful",
        token: accessToken,
        refreshToken,
        trialExpired: status.trialExpired,
        subscriptionExpired: status.subscriptionExpired,
        warningMessage: status.warningMessage,
        action_required: status.trialExpired ? 'deposit' : (status.subscriptionExpired ? 'renewal' : null),
      });

    } else {
      // ── New user — SIGNUP ────────────────────────────────────────────────
      if (!shop_data || !shop_data.shop_name || !shop_data.category) {
        return res.status(400).json({
          message: "Shop information required for signup",
          requiresShopData: true,
        });
      }

      const { shop_name, category, owner_phone, address, plan_type } = shop_data;

      const today = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(today.getDate() + 31);

      const shop = await Shop.create({
        shop_name: shop_name.trim(),
        category,
        owner_phone: owner_phone || "",
        address: address || "",
        trial_start_date: today,
        trial_end_date: trialEnd,
        subscription_active: false,
        plan_type: plan_type || "trial",
        subscription_plan: "trial",
      });

      const newUser = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: null,
        google_id,
        auth_provider: "google",
        role: "owner",
        shop_id: shop.id,
        isActive: true,
      });

      const tokenPayload = { user_id: newUser.id, name: newUser.name, role: newUser.role, shop_id: shop.id };
      const { accessToken, refreshToken } = generateTokens(tokenPayload);

      return res.status(201).json({
        success: true,
        message: "Signup successful",
        token: accessToken,
        refreshToken,
        plan_type: "trial",
      });
    }

  } catch (error) {
    console.error("❌ Google Auth Error:", error.message);
    res.status(500).json({ message: "Google authentication failed" });
  }
};
