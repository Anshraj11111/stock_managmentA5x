import bcrypt from "bcrypt";
import User from "../models/usermodel.js";
import { clearShopCache } from "../middlewares/cache.js";

/**
 * ➕ ADD STAFF (OWNER ONLY)
 */
export const addStaff = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ Optimized: Check existence with minimal fields
    const exists = await User.findOne({ 
      where: { email },
      attributes: ['id'],
      raw: true
    });
    
    if (exists) {
      return res.status(400).json({ message: "Staff already exists" });
    }

    // ✅ Reduced from 10 to 8 rounds for faster performance (still secure)
    const hashedPassword = await bcrypt.hash(password, 8);

    const staff = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "staff",
      shop_id: req.user.shop_id,
      isActive: true,
    });

    // Clear cache
    clearShopCache(req.user.shop_id);

    res.status(201).json({
      message: "Staff added successfully",
      staff_id: staff.id,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 👥 GET ALL STAFF
 */
export const getAllStaff = async (req, res) => {
  try {
    // ✅ Optimized: Only needed fields, ordered, raw mode
    const staffList = await User.findAll({
      where: {
        shop_id: req.user.shop_id,
        role: "staff",
      },
      attributes: ["id", "name", "email", "isActive", "createdAt"],
      order: [['name', 'ASC']],
      raw: true
    });

    res.json(staffList);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ✏️ UPDATE STAFF
 */
export const updateStaff = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, isActive } = req.body;

    let updateData = { name, email, isActive };

    if (password) {
      // ✅ Reduced from 10 to 8 rounds for faster performance
      const hashedPassword = await bcrypt.hash(password, 8);
      updateData.password = hashedPassword;
    }

    const updated = await User.update(updateData, {
      where: {
        id,
        role: "staff",
        shop_id: req.user.shop_id,
      },
    });

    if (updated[0] === 0) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Clear cache
    clearShopCache(req.user.shop_id);

    res.json({ message: "Staff updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


/**
 * 🔒 DEACTIVATE STAFF (SOFT DELETE)
 */
export const deactivateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await User.update(
      { isActive: false }, // ✅ FIXED
      {
        where: {
          id,
          role: "staff",
          shop_id: req.user.shop_id,
        },
      }
    );

    res.json({ message: "Staff deactivated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 🔓 ACTIVATE STAFF
 */
export const activateStaff = async (req, res) => {
  try {
    const { id } = req.params;

    await User.update(
      { isActive: true }, // ✅ FIXED
      {
        where: {
          id,
          role: "staff",
          shop_id: req.user.shop_id,
        },
      }
    );

    res.json({ message: "Staff activated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ❌ DELETE STAFF (HARD DELETE)
 */
export const deleteStaff = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await User.destroy({
      where: {
        id,
        role: "staff",
        shop_id: req.user.shop_id,
      },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Clear cache
    clearShopCache(req.user.shop_id);

    res.json({ message: "Staff deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
