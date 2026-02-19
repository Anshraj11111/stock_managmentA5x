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
export const adminLogin = async (req, res) => {
  try {
    const { email, password, admin_code } = req.body;

    // Validate required fields
    if (!email || !password || !admin_code) {
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

    // Find admin by email
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Check if admin is active
    if (!admin.is_active) {
      return res.status(403).json({
        success: false,
        message: "Admin account is inactive"
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, admin.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials"
      });
    }

    // Generate token
    const token = generateAdminToken(admin);

    res.json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message
    });
  }
};

/**
 * ======================================
 * DASHBOARD STATISTICS
 * ======================================
 */
export const getDashboardStats = async (req, res) => {
  try {
    // Total and active users
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { isActive: true } });
    const inactiveUsers = totalUsers - activeUsers;

    // Shop statistics
    const totalShops = await Shop.count();
    const activeShops = await Shop.count({ 
      where: { subscription_active: true } 
    });
    const trialShops = await Shop.count({ 
      where: { plan_type: 'trial' } 
    });
    const expiredShops = totalShops - activeShops;

    // Subscription statistics
    const activeSubscriptions = activeShops;
    const trialSubscriptions = trialShops;
    const expiredSubscriptions = expiredShops;

    // Revenue statistics
    const totalRevenue = await Payment.sum('amount') || 0;
    
    // Monthly revenue (current month)
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    const monthlyRevenue = await Payment.sum('amount', {
      where: {
        createdAt: {
          [Op.gte]: startOfMonth,
          [Op.lte]: endOfMonth
        }
      }
    }) || 0;

    // Today's revenue
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    
    const todayRevenue = await Payment.sum('amount', {
      where: {
        createdAt: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        }
      }
    }) || 0;

    // Product and staff counts
    const totalProducts = await Product.count();
    const totalStaff = await User.count({ where: { role: 'staff' } });

    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          inactive: inactiveUsers
        },
        shops: {
          total: totalShops,
          active: activeShops,
          trial: trialShops,
          expired: expiredShops
        },
        subscriptions: {
          active: activeSubscriptions,
          trial: trialSubscriptions,
          expired: expiredSubscriptions
        },
        revenue: {
          total: totalRevenue,
          monthly: monthlyRevenue,
          today: todayRevenue
        },
        counts: {
          products: totalProducts,
          staff: totalStaff
        }
      }
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
      error: error.message
    });
  }
};

/**
 * ======================================
 * USER MANAGEMENT
 * ======================================
 */

// Get paginated users list (OPTIMIZED)
export const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status === 'active') {
      where.isActive = true;
    } else if (status === 'inactive') {
      where.isActive = false;
    }
    
    // Optimized query with eager loading
    const { count, rows: users } = await User.findAndCountAll({
      where,
      include: [{
        model: Shop,
        attributes: ['shop_name', 'plan_type', 'subscription_active'],
        required: false
      }],
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt'],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']],
      raw: false,
      nest: true
    });
    
    // Format response
    const formattedUsers = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      shop_name: user.Shop?.shop_name || 'N/A',
      role: user.role,
      plan_type: user.Shop?.plan_type || 'N/A',
      subscription_status: user.Shop?.subscription_active ? 'Active' : 'Inactive',
      status: user.isActive ? 'Active' : 'Inactive',
      createdAt: user.createdAt
    }));
    
    res.json({
      success: true,
      users: formattedUsers,
      total: count,
      page: parseInt(page),
      pages: Math.ceil(count / limit)
    });
  } catch (error) {
    console.error("Get users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message
    });
  }
};

// Get user by ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id, {
      include: [{
        model: Shop,
        attributes: ['shop_name', 'plan_type', 'subscription_active', 'trial_end_date']
      }]
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        shop: user.Shop,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt
      }
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user",
      error: error.message
    });
  }
};

// Activate user
export const activateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    await user.update({ isActive: true });
    
    res.json({
      success: true,
      message: "User activated successfully"
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to activate user",
      error: error.message
    });
  }
};

// Deactivate user
export const deactivateUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    await user.update({ isActive: false });
    
    res.json({
      success: true,
      message: "User deactivated successfully"
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to deactivate user",
      error: error.message
    });
  }
};

// Soft delete user
export const softDeleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    // Soft delete by deactivating
    await user.update({ isActive: false });
    
    res.json({
      success: true,
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
      error: error.message
    });
  }
};

/**
 * ======================================
 * SHOP MANAGEMENT
 * ======================================
 */

// Get paginated shops list (OPTIMIZED)
export const getShops = async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '' } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Build where clause
    const where = {};
    
    if (search) {
      where.shop_name = { [Op.like]: `%${search}%` };
    }
    
    if (status === 'active') {
      where.subscription_active = true;
    } else if (status === 'inactive') {
      where.subscription_active = false;
    } else if (status === 'trial') {
      where.plan_type = 'trial';
    }
    
    // Optimized query with raw SQL for better performance
    const shops = await sequelize.query(`
      SELECT 
        s.id,
        s.shop_name,
        s.plan_type,
        s.trial_end_date,
        s.subscription_active,
        s.createdAt,
        owner.name as owner_name,
        owner.email as owner_email,
        COALESCE(product_counts.total, 0) as total_products,
        COALESCE(staff_counts.total, 0) as total_staff
      FROM Shops s
      LEFT JOIN (
        SELECT shop_id, name, email 
        FROM Users 
        WHERE role = 'owner'
      ) owner ON s.id = owner.shop_id
      LEFT JOIN (
        SELECT shop_id, COUNT(*) as total 
        FROM Products 
        GROUP BY shop_id
      ) product_counts ON s.id = product_counts.shop_id
      LEFT JOIN (
        SELECT shop_id, COUNT(*) as total 
        FROM Users 
        WHERE role = 'staff' 
        GROUP BY shop_id
      ) staff_counts ON s.id = staff_counts.shop_id
      WHERE 1=1
        ${search ? `AND s.shop_name LIKE '%${search}%'` : ''}
        ${status === 'active' ? 'AND s.subscription_active = 1' : ''}
        ${status === 'inactive' ? 'AND s.subscription_active = 0' : ''}
        ${status === 'trial' ? "AND s.plan_type = 'trial'" : ''}
      ORDER BY s.createdAt DESC
      LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    // Get total count
    const countResult = await sequelize.query(`
      SELECT COUNT(*) as total
      FROM Shops s
      WHERE 1=1
        ${search ? `AND s.shop_name LIKE '%${search}%'` : ''}
        ${status === 'active' ? 'AND s.subscription_active = 1' : ''}
        ${status === 'inactive' ? 'AND s.subscription_active = 0' : ''}
        ${status === 'trial' ? "AND s.plan_type = 'trial'" : ''}
    `, {
      type: sequelize.QueryTypes.SELECT
    });
    
    const total = countResult[0].total;
    
    // Format response
    const formattedShops = shops.map(shop => ({
      id: shop.id,
      shop_name: shop.shop_name,
      owner_name: shop.owner_name || 'N/A',
      owner_email: shop.owner_email || 'N/A',
      plan_type: shop.plan_type || 'N/A',
      trial_end_date: shop.trial_end_date,
      subscription_active: shop.subscription_active,
      total_products: parseInt(shop.total_products) || 0,
      total_staff: parseInt(shop.total_staff) || 0,
      createdAt: shop.createdAt
    }));
    
    res.json({
      success: true,
      shops: formattedShops,
      total: total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error("Get shops error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shops",
      error: error.message
    });
  }
};

// Suspend shop
export const suspendShop = async (req, res) => {
  try {
    const { id } = req.params;
    
    const shop = await Shop.findByPk(id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }
    
    await shop.update({ subscription_active: false });
    
    res.json({
      success: true,
      message: "Shop suspended successfully"
    });
  } catch (error) {
    console.error("Suspend shop error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to suspend shop",
      error: error.message
    });
  }
};

// Extend trial period
export const extendTrial = async (req, res) => {
  try {
    const { id } = req.params;
    const { days } = req.body;
    
    if (!days || days <= 0) {
      return res.status(400).json({
        success: false,
        message: "Valid number of days required"
      });
    }
    
    const shop = await Shop.findByPk(id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }
    
    // Extend trial end date
    const currentTrialEnd = shop.trial_end_date ? new Date(shop.trial_end_date) : new Date();
    const newTrialEnd = new Date(currentTrialEnd);
    newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));
    
    await shop.update({ trial_end_date: newTrialEnd });
    
    res.json({
      success: true,
      message: `Trial extended by ${days} days`,
      new_trial_end_date: newTrialEnd
    });
  } catch (error) {
    console.error("Extend trial error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to extend trial",
      error: error.message
    });
  }
};

// Update subscription status
export const updateSubscription = async (req, res) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    
    if (typeof active !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "Active status (boolean) required"
      });
    }
    
    const shop = await Shop.findByPk(id);
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }
    
    await shop.update({ subscription_active: active });
    
    res.json({
      success: true,
      message: `Subscription ${active ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    console.error("Update subscription error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update subscription",
      error: error.message
    });
  }
};


/**
 * ======================================
 * ANALYTICS
 * ======================================
 */

// Get analytics data
export const getAnalytics = async (req, res) => {
  try {
    const { type = 'overview', period = 'monthly' } = req.query;
    
    // Calculate date range based on period
    let startDate = new Date();
    let groupBy = 'DATE(createdAt)';
    
    if (period === 'daily') {
      startDate.setDate(startDate.getDate() - 30); // Last 30 days
      groupBy = 'DATE(createdAt)';
    } else if (period === 'weekly') {
      startDate.setDate(startDate.getDate() - 90); // Last 90 days
      groupBy = 'YEARWEEK(createdAt)';
    } else if (period === 'monthly') {
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      groupBy = 'DATE_FORMAT(createdAt, "%Y-%m")';
    }
    
    if (type === 'users') {
      // User signup trends
      const userTrends = await sequelize.query(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as count
        FROM Users
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      });
      
      return res.json({
        success: true,
        data: userTrends,
        type: 'users',
        period
      });
    }
    
    if (type === 'shops') {
      // Shop creation trends
      const shopTrends = await sequelize.query(`
        SELECT 
          ${groupBy} as period,
          COUNT(*) as count
        FROM Shops
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      });
      
      return res.json({
        success: true,
        data: shopTrends,
        type: 'shops',
        period
      });
    }
    
    if (type === 'revenue') {
      // Revenue trends
      const revenueTrends = await sequelize.query(`
        SELECT 
          ${groupBy} as period,
          SUM(amount) as total
        FROM Payments
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      });
      
      return res.json({
        success: true,
        data: revenueTrends,
        type: 'revenue',
        period
      });
    }
    
    if (type === 'conversion') {
      // Trial to paid conversion
      const conversionData = await sequelize.query(`
        SELECT 
          COUNT(CASE WHEN plan_type = 'trial' THEN 1 END) as trial_count,
          COUNT(CASE WHEN plan_type != 'trial' AND subscription_active = 1 THEN 1 END) as paid_count,
          COUNT(*) as total_count
        FROM Shops
        WHERE createdAt >= :startDate
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      });
      
      const data = conversionData[0];
      const conversionRate = data.total_count > 0 
        ? ((data.paid_count / data.total_count) * 100).toFixed(2)
        : 0;
      
      return res.json({
        success: true,
        data: {
          trial_count: data.trial_count,
          paid_count: data.paid_count,
          total_count: data.total_count,
          conversion_rate: conversionRate
        },
        type: 'conversion',
        period
      });
    }
    
    // Default: overview
    const overview = await Promise.all([
      // User trends
      sequelize.query(`
        SELECT ${groupBy} as period, COUNT(*) as count
        FROM Users
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Shop trends
      sequelize.query(`
        SELECT ${groupBy} as period, COUNT(*) as count
        FROM Shops
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      }),
      
      // Revenue trends
      sequelize.query(`
        SELECT ${groupBy} as period, SUM(amount) as total
        FROM Payments
        WHERE createdAt >= :startDate
        GROUP BY period
        ORDER BY period ASC
      `, {
        replacements: { startDate },
        type: sequelize.QueryTypes.SELECT
      })
    ]);
    
    res.json({
      success: true,
      data: {
        users: overview[0],
        shops: overview[1],
        revenue: overview[2]
      },
      type: 'overview',
      period
    });
  } catch (error) {
    console.error("Get analytics error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch analytics",
      error: error.message
    });
  }
};


/**
 * ======================================
 * SHOP PRODUCTS
 * ======================================
 */

// Get products by shop ID
export const getShopProducts = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get shop details
    const shop = await Shop.findByPk(id, {
      attributes: ['id', 'shop_name']
    });
    
    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found"
      });
    }
    
    // Get all products for this shop
    const products = await Product.findAll({
      where: { shop_id: id },
      attributes: [
        'id',
        'product_name',
        'purchase_price',
        'selling_price',
        'stock_quantity',
        'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });
    
    // Calculate profit margin for each product
    const productsWithMargin = products.map(product => {
      const profit = product.selling_price - product.purchase_price;
      const profitMargin = product.purchase_price > 0 
        ? ((profit / product.purchase_price) * 100).toFixed(2)
        : 0;
      
      return {
        id: product.id,
        product_name: product.product_name,
        purchase_price: product.purchase_price,
        selling_price: product.selling_price,
        stock_quantity: product.stock_quantity,
        profit: profit,
        profit_margin: profitMargin,
        createdAt: product.createdAt
      };
    });
    
    res.json({
      success: true,
      shop: {
        id: shop.id,
        name: shop.shop_name
      },
      products: productsWithMargin,
      total: productsWithMargin.length
    });
  } catch (error) {
    console.error("Get shop products error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch shop products",
      error: error.message
    });
  }
};
