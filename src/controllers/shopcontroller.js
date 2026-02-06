import Shop from "../models/shopmodel.js";

/**
 * 🏪 GET SHOP DETAILS (OWNER ONLY)
 */
export const getShopDetails = async (req, res) => {
  try {
    const shop = req.shop; // shopMiddleware se aaya

    res.json({
      id: shop.id,
      shop_name: shop.shop_name,
      category: shop.category,
      trial_end_date: shop.trial_end_date,
      subscription_active: shop.subscription_active,
      createdAt: shop.createdAt,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * ✏️ UPDATE SHOP DETAILS (OWNER ONLY)
 */
export const updateShopDetails = async (req, res) => {
  try {
    const { shop_name, category } = req.body;

    if (!shop_name && !category) {
      return res
        .status(400)
        .json({ message: "Nothing to update" });
    }

    await Shop.update(
      { shop_name, category },
      { where: { id: req.shop.id } }
    );

    res.json({ message: "Shop updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
