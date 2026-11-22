import Product from "../models/productmodel.js";
import { clearShopCache } from "../middlewares/cache.js";
import { Op } from "sequelize";

// Simple in-memory product cache with TTL
const productsCache  = new Map();
const CACHE_TTL      = 30 * 1000; // 30 seconds

const cacheKey  = (shopId, page, limit, search) => `products:${shopId}:${page}:${limit}:${search || ''}`;
const getCache  = (key) => { const c = productsCache.get(key); return c && Date.now() - c.ts < CACHE_TTL ? c.data : null; };
const setCache  = (key, data) => { productsCache.set(key, { data, ts: Date.now() }); if (productsCache.size > 50) productsCache.delete(productsCache.keys().next().value); };
export const clearProductsCache = (shopId) => { for (const k of productsCache.keys()) if (k.startsWith(`products:${shopId}:`)) productsCache.delete(k); };

productsCache.clear();

/**
 * ADD PRODUCT
 */
export const addProduct = async (req, res) => {
  try {
    const {
      product_name, purchase_price, selling_price, stock_quantity,
      stock_unit, low_stock_threshold, storage_location, expiry_date,
      date_added, sub_category, size, brand_name,
    } = req.body;

    if (!product_name || purchase_price === undefined || selling_price === undefined || stock_quantity === undefined) {
      return res.status(400).json({ message: "product_name, purchase_price, selling_price and stock_quantity are required" });
    }

    if (isNaN(parseFloat(selling_price)) || isNaN(parseFloat(purchase_price))) {
      return res.status(400).json({ message: "Prices must be valid numbers" });
    }

    const product = await Product.create({
      product_name:        product_name.trim(),
      purchase_price:      parseFloat(purchase_price),
      selling_price:       parseFloat(selling_price),
      stock_quantity:      String(stock_quantity),
      stock_unit:          stock_unit          || 'pieces',
      low_stock_threshold: low_stock_threshold || 10,
      storage_location:    storage_location    || null,
      expiry_date:         expiry_date         || null,
      date_added:          date_added          || null,
      sub_category:        sub_category        || null,
      size:                size                || null,
      brand_name:          brand_name          || null,
      shop_id:             req.user.shop_id,
    });

    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("addProduct error:", error.message);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

/**
 * GET ALL PRODUCTS (paginated)
 */
export const getProducts = async (req, res) => {
  try {
    const page   = parseInt(req.query.page)  || 1;
    const limit  = Math.min(parseInt(req.query.limit) || 1000, 5000);
    const offset = (page - 1) * limit;
    const search = req.query.search || '';

    const key    = cacheKey(req.user.shop_id, page, limit, search);
    const cached = getCache(key);
    if (cached) return res.json(cached);

    const where = { shop_id: req.user.shop_id };
    if (search) where.product_name = { [Op.like]: `%${search}%` };

    const totalCount = await Product.count({ where });

    const products = await Product.findAll({
      where,
      attributes: [
        'id', 'product_name', 'purchase_price', 'selling_price',
        'stock_quantity', 'stock_unit', 'low_stock_threshold',
        'storage_location', 'expiry_date', 'date_added',
        'sub_category', 'size', 'brand_name',
      ],
      order:  [['product_name', 'ASC']],
      limit,
      offset,
      raw:    true,
    });

    const result = {
      products,
      pagination: {
        page, limit, totalCount,
        totalPages: Math.ceil(totalCount / limit),
        hasMore: offset + products.length < totalCount,
      },
    };

    setCache(key, result);
    res.json(result);
  } catch (error) {
    console.error("getProducts error:", error.message);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

/**
 * GET PRODUCTS FOR BILLING (lightweight, no pagination)
 */
export const getProductsForBilling = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: {
        shop_id:        req.user.shop_id,
        stock_quantity: { [Op.gt]: 0 },
      },
      attributes: ['id', 'product_name', 'selling_price', 'stock_quantity'],
      order:      [['product_name', 'ASC']],
      raw:        true,
    });

    res.json(products);
  } catch (error) {
    console.error("getProductsForBilling error:", error.message);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

/**
 * UPDATE PRODUCT
 * Whitelisted fields only — prevents mass assignment.
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const ALLOWED = [
      'product_name', 'purchase_price', 'selling_price', 'stock_quantity',
      'stock_unit', 'low_stock_threshold', 'storage_location', 'expiry_date',
      'sub_category', 'size', 'brand_name',
    ];

    const updateData = {};
    for (const field of ALLOWED) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    // Sanitize optional nullable fields
    for (const field of ['expiry_date', 'sub_category', 'size', 'brand_name', 'storage_location']) {
      if (updateData[field] === '' || updateData[field] === 'Invalid date') updateData[field] = null;
    }

    if (updateData.selling_price  !== undefined && isNaN(parseFloat(updateData.selling_price)))  return res.status(400).json({ message: "Invalid selling price" });
    if (updateData.purchase_price !== undefined && isNaN(parseFloat(updateData.purchase_price))) return res.status(400).json({ message: "Invalid purchase price" });
    if (Object.keys(updateData).length === 0) return res.status(400).json({ message: "No valid fields to update" });

    const [affected] = await Product.update(updateData, { where: { id, shop_id: req.user.shop_id } });

    if (affected === 0) return res.status(404).json({ message: "Product not found" });

    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    console.error("updateProduct error:", error.message);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};

/**
 * DELETE PRODUCT
 */
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Product.destroy({ where: { id, shop_id: req.user.shop_id } });

    if (!deleted) return res.status(404).json({ message: "Product not found" });

    clearShopCache(req.user.shop_id);
    clearProductsCache(req.user.shop_id);

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("deleteProduct error:", error.message);
    res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message });
  }
};
