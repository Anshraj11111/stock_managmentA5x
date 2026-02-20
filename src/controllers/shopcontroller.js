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
    address: shop.address,
    owner_phone: shop.owner_phone,
    trial_end_date: shop.trial_end_date,
    subscription_active: shop.subscription_active,
    upi_id: shop.upi_id,
    upi_name: shop.upi_name,
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
    const { shop_name, category, address, owner_phone, upi_id, upi_name } = req.body;

    if (!shop_name && !category && !address && !owner_phone && !upi_id && !upi_name) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    await Shop.update(
      {
        shop_name,
        category,
        address,
        owner_phone,
        upi_id,
        upi_name
      },
      { where: { id: req.shop.id } }
    );

    res.json({ message: "Shop updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
