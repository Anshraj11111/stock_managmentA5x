import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/usermodel.js";
import Shop from "../models/shopmodel.js";

/**
 * OWNER SIGNUP
 */
export const signup = async (req, res) => {
  try {
    const { name, email, password, shop_name, category } = req.body;

    if (!name || !email || !password || !shop_name) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // 🔐 password hash
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🏪 create shop with trial
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7); // 7 days trial

    const shop = await Shop.create({
      shop_name,
      category,
      trial_end_date: trialEnd,
      subscription_active: false,
    });

    // 👤 create owner
    const owner = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "owner",
      shop_id: shop.id,
      isActive: true,
    });

    // 🔑 token
    const token = jwt.sign(
      {
        user_id: owner.id,
        role: owner.role,
        shop_id: shop.id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      shop_id: shop.id,
      trial_end_date: shop.trial_end_date,
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

    const token = jwt.sign(
      {
        user_id: user.id,
        role: user.role,
        shop_id: user.shop_id,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      message: "Login successful",
      token,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};