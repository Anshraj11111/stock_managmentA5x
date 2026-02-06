import Product from "../models/productmodel.js";

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
    } = req.body;

    if (!product_name || !purchase_price || !selling_price || !stock_quantity) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const product = await Product.create({
      product_name,
      purchase_price,
      selling_price,
      stock_quantity,
      shop_id: req.user.shop_id, // JWT middleware se aayega
    });

    res.status(201).json({
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * 📦 GET ALL PRODUCTS (SHOP-WISE)
 */
export const getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({
      where: { shop_id: req.user.shop_id },
      order: [["id", "DESC"]],
    });

    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ✏️ UPDATE PRODUCT
 */
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const updated = await Product.update(req.body, {
      where: {
        id,
        shop_id: req.user.shop_id,
      },
    });

    if (updated[0] === 0) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.json({ message: "Product updated successfully" });
  } catch (error) {
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

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
