import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import User from "../models/usermodel.js";
import Shop from "../models/shopmodel.js";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * OWNER SIGNUP
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, shop_name, category, owner_phone, address } = req.body;

    if (!name || !email || !password || !shop_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Reduced from 10 to 8 rounds for faster performance (still secure)
    const hashedPassword = await bcrypt.hash(password, 8);

    const today = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(today.getDate() + 31); // 31 days trial

    // ✅ FIX — store shop in variable
    const shop = await Shop.create({
      shop_name,
      category,
      owner_phone,
      address,
      trial_start_date: today,
      trial_end_date: trialEnd,
      subscription_active: false,
      plan_type: "trial",
      subscription_plan: "trial",
    });

    const owner = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
      shop_id: shop.id,
      isActive: true,
    });

    const token = jwt.sign(
      {
        user_id: owner.id,
        name: owner.name,
        role: owner.role,
        shop_id: shop.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.status(201).json({
      success: true,  // ✅ add this
      message: "Signup successful",
      token,
      plan_type: "trial"
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * LOGIN (OWNER + STAFF)
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Check trial expiry and subscription for shop
    const shop = await Shop.findByPk(user.shop_id);
    let trialExpired = false;
    let subscriptionExpired = false;
    let warningMessage = '';

    if (shop) {
      // Check if shop is suspended
      if (shop.isSuspended) {
        return res.status(403).json({ 
          message: shop.suspension_reason || "Your account has been suspended. Please contact support: +91-8269858259",
          suspended: true
        });
      }

      const today = new Date();
      
      // Check if trial expired and deposit not paid
      if ((shop.subscription_plan === 'trial' || !shop.subscription_plan) && shop.trial_end_date) {
        const trialEndDate = new Date(shop.trial_end_date);
        if (trialEndDate < today && !shop.deposit_paid) {
          trialExpired = true;
          warningMessage = "Trial expired. Please pay ₹100 deposit to continue. Contact: +91-8269858259 for any queries.";
        }
      }

      // Check if subscription expired
      if (shop.subscription_end_date) {
        const endDate = new Date(shop.subscription_end_date);
        if (endDate < today) {
          subscriptionExpired = true;
          warningMessage = "Subscription expired. Please renew your subscription. Contact: +91-8269858259 for any queries.";
        }
      }
    }

    const token = jwt.sign(
      {
        user_id: user.id,
        name: user.name,
        role: user.role,
        shop_id: user.shop_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "30d" }
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      trialExpired,
      subscriptionExpired,
      warningMessage,
      action_required: trialExpired ? 'deposit' : (subscriptionExpired ? 'renewal' : null)
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * GOOGLE OAUTH LOGIN/SIGNUP
 */
export const googleAuth = async (req, res) => {
  try {
    const { credential, shop_data } = req.body;

    console.log("🔵 Google Auth Request Received");
    console.log("📦 Request Body:", JSON.stringify(req.body, null, 2));
    console.log("🔑 Credential:", credential ? "Present" : "Missing");
    console.log("🏪 Shop Data:", shop_data ? "Present" : "Missing");

    if (!credential) {
      console.log("❌ No credential provided");
      return res.status(400).json({ message: "Google credential is required" });
    }

    console.log("🔍 Verifying Google token...");
    console.log("🆔 Google Client ID:", process.env.GOOGLE_CLIENT_ID ? "Loaded" : "MISSING!");

    // Verify Google token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    console.log("✅ Token verified successfully");

    const payload = ticket.getPayload();
    const { sub: google_id, email, name, picture } = payload;

    console.log("👤 User Info:", { google_id, email, name });

    // Check if user exists
    let user = await User.findOne({ where: { email } });

    if (user) {
      // User exists - LOGIN
      // Update google_id if not set
      if (!user.google_id) {
        await user.update({ 
          google_id, 
          auth_provider: "google" 
        });
      }

      // Check trial/subscription status
      const shop = await Shop.findByPk(user.shop_id);
      let trialExpired = false;
      let subscriptionExpired = false;
      let warningMessage = '';

      if (shop) {
        if (shop.isSuspended) {
          return res.status(403).json({ 
            message: shop.suspension_reason || "Your account has been suspended. Please contact support: +91-8269858259",
            suspended: true
          });
        }

        const today = new Date();
        
        if ((shop.subscription_plan === 'trial' || !shop.subscription_plan) && shop.trial_end_date) {
          const trialEndDate = new Date(shop.trial_end_date);
          if (trialEndDate < today && !shop.deposit_paid) {
            trialExpired = true;
            warningMessage = "Trial expired. Please pay ₹100 deposit to continue.";
          }
        }

        if (shop.subscription_end_date) {
          const endDate = new Date(shop.subscription_end_date);
          if (endDate < today) {
            subscriptionExpired = true;
            warningMessage = "Subscription expired. Please renew your subscription.";
          }
        }
      }

      const token = jwt.sign(
        {
          user_id: user.id,
          name: user.name,
          role: user.role,
          shop_id: user.shop_id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.json({
        success: true,
        message: "Login successful",
        token,
        trialExpired,
        subscriptionExpired,
        warningMessage,
        action_required: trialExpired ? 'deposit' : (subscriptionExpired ? 'renewal' : null)
      });

    } else {
      // User doesn't exist - SIGNUP
      // For signup, we need shop data
      if (!shop_data || !shop_data.shop_name || !shop_data.category) {
        return res.status(400).json({ 
          message: "Shop information required for signup",
          requiresShopData: true 
        });
      }

      const { shop_name, category, owner_phone, address, plan_type } = shop_data;

      const today = new Date();
      const trialEnd = new Date();
      trialEnd.setDate(today.getDate() + 31); // 31 days trial

      // Create shop
      const shop = await Shop.create({
        shop_name,
        category,
        owner_phone: owner_phone || "",
        address: address || "",
        trial_start_date: today,
        trial_end_date: trialEnd,
        subscription_active: false,
        plan_type: plan_type || "trial",
        subscription_plan: "trial",
      });

      // Create user with Google OAuth
      const newUser = await User.create({
        name,
        email,
        password: null, // No password for Google users
        google_id,
        auth_provider: "google",
        role: "owner",
        shop_id: shop.id,
        isActive: true,
      });

      const token = jwt.sign(
        {
          user_id: newUser.id,
          name: newUser.name,
          role: newUser.role,
          shop_id: shop.id,
        },
        process.env.JWT_SECRET,
        { expiresIn: "30d" }
      );

      return res.status(201).json({
        success: true,
        message: "Signup successful",
        token,
        plan_type: "trial"
      });
    }

  } catch (error) {
    console.error("❌ Google Auth Error:", error);
    console.error("📋 Error Details:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      message: "Google authentication failed",
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};