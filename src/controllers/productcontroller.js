import Product from "../models/productmodel.js";
import { clearShopCache } from "../middlewares/cache.js";
import { Op } from "sequelize";

// ✅ Simple in-memory cache for products with TTL
const productsCache = new Map();
const PRODUCTS_CACHE_TTL = 30 * 1000; // 30 seconds cache

const getProductsCacheKey = (shopId, page, limit, search) => {
  return `products:${shopId}:${page}:${limit}:${search || ''}`;
};

const getFromProductsCache = (key) => {
  const cached = productsCache.get(key);
  if (cached && Date.now() - cached.timestamp < PRODUCTS_CACHE_TTL) {
    return cached.data;
  }
  productsCache.delete(key);
  return null;
};

const setProductsCache = (key, data) => {
  productsCache.set(key, { data, timestamp: Date.now() });
  
  // Clean up old cache entries (keep max 50 entries)
  if (productsCache.size > 50) {
    const firstKey = productsCache.keys().next().value;
    productsCache.delete(firstKey);
  }
};

const clearProductsCache = (shopId) => {
  // Clear all cache entries for this shop
  for (const key of productsCache.keys()) {
    if (key.startsWith(`products:${shopId}:`)) {
      productsCache.delete(key);
    }
  }
};

/**
 * ➕ ADD PRODUCT
 */
export const addProduct = async (req, res) => {
  try {
    const {
      product_name,
      purchase_price,
      selling_price,
      stock_quantity,
      stock_unit,
      low_stock_threshold,
      storage_location,
      expiry_date,
      date_added,
      sub_category,
      size,
      brand_name,
    } = req.body;

    if (!product_name || !purchase_price || !selling_price || !stock_quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const product = await Product.create({
      product_name,
      purchase_price,
      selling_price,
      stock_quantity,
      stock_unit: stock_unit || 'pieces',
      low_stock_threshold: low_stock_threshold || 10,
      storage_location: storage_location || null,
      expiry_date: expiry_date || null,
      date_added: date_added || null,
      sub_category: sub_category || null,
      size: size || null,
      brand_name: brand_name || null,
      shop_id: req.user.shop_id,
    });

    // Clear cache for this shop
    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 📦 GET ALL PRODUCTS (SHOP-WISE) - WITH PAGINATION
 */
export const getProducts = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: "req.user missing" });
    }

    // ✅ Pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50; // Default 50 items per page
    const offset = (page - 1) * limit;
    
    // ✅ Search parameter
    const search = req.query.search || '';

    // Check cache first
    const cacheKey = getProductsCacheKey(req.user.shop_id, page, limit, search);
    const cached = getFromProductsCache(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // ✅ Build where clause
    const whereClause = { shop_id: req.user.shop_id };
    if (search) {
      whereClause.product_name = {
        [Op.like]: `%${search}%`
      };
    }

    // ✅ Get total count for pagination
    const totalCount = await Product.count({
      where: whereClause
    });

    // ✅ Optimized: Only select needed fields, use index, with pagination
    const products = await Product.findAll({
      where: whereClause,
      attributes: [
        'id', 
        'product_name', 
        'purchase_price', 
        'selling_price', 
        'stock_quantity', 
        'stock_unit', 
        'low_stock_threshold', 
        'storage_location',
        'expiry_date',
        'date_added',
        'sub_category',
        'size',
        'brand_name'
      ],
      order: [['product_name', 'ASC']],
      limit,
      offset,
      raw: true // Faster serialization
    });

    const result = {
      products,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + products.length < totalCount
      }
    };

    // Cache the result
    setProductsCache(cacheKey, result);

    res.json(result);
  } catch (error) {
    console.error("GET PRODUCTS ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * 📦 GET ALL PRODUCTS (FOR BILLING) - Lightweight, no pagination
 */
export const getProductsForBilling = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({ message: "req.user missing" });
    }

    // ✅ Only get essential fields for billing
    const products = await Product.findAll({
      where: { 
        shop_id: req.user.shop_id,
        stock_quantity: { [Op.gt]: 0 } // Only products in stock
      },
      attributes: [
        'id', 
        'product_name', 
        'selling_price', 
        'stock_quantity'
      ],
      order: [['product_name', 'ASC']],
      raw: true
    });

    res.json(products);
  } catch (error) {
    console.error("GET PRODUCTS FOR BILLING ERROR:", error);
    res.status(500).json({ error: error.message });
  }
};


/**
 * ✏️ UPDATE PRODUCT
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    console.log("📝 Update Product Request:");
    console.log("Product ID:", id);
    console.log("Request Body:", req.body);
    console.log("Shop ID:", req.user.shop_id);

    // ✅ Clean up date fields - convert empty strings to null
    const updateData = { ...req.body };
    if (updateData.expiry_date === '' || updateData.expiry_date === 'Invalid date') {
      updateData.expiry_date = null;
    }
    
    // ✅ Clean up clothes fields - convert empty strings to null
    if (updateData.sub_category === '') {
      updateData.sub_category = null;
    }
    if (updateData.size === '') {
      updateData.size = null;
    }
    if (updateData.brand_name === '') {
      updateData.brand_name = null;
    }
    
    // ✅ Ensure date_added is not modified during updates
    // Remove date_added from update data to preserve original value
    delete updateData.date_added;

    console.log("📝 Cleaned Update Data:", updateData);

    const updated = await Product.update(updateData, {
      where: {
        id,
        shop_id: req.user.shop_id,
      },
    });

    console.log("✅ Update Result:", updated);

    if (updated[0] === 0) {
      console.log("❌ Product not found");
      return res.status(404).json({ message: "Product not found" });
    }

    // Clear cache for this shop
    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    console.log("✅ Product updated successfully");
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("❌ UPDATE PRODUCT ERROR:", error);
    console.error("Error details:", error.message);
    console.error("Error stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
};

/**
 * ❌ DELETE PRODUCT
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.destroy({
      where: {
        id,
        shop_id: req.user.shop_id,
      },
    });

    if (!deleted) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Clear cache for this shop
    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
