import Shop from "../models/shopmodel.js";

/**
 * GET SHOP DETAILS (OWNER ONLY)
 */
export const getShopDetails = async (req, res) => {
  try {
    const shop = req.shop;

    res.json({
      id:                   shop.id,
      shop_name:            shop.shop_name,
      category:             shop.category,
      address:              shop.address,
      owner_phone:          shop.owner_phone,
      gstin:                shop.gstin,
      pan:                  shop.pan,
      bank_name:            shop.bank_name,
      bank_branch:          shop.bank_branch,
      bank_account_number:  shop.bank_account_number,
      bank_ifsc:            shop.bank_ifsc,
      authorized_signatory: shop.authorized_signatory,
      signature_image:      shop.signature_image,
      terms_and_conditions: shop.terms_and_conditions,
      trial_end_date:       shop.trial_end_date,
      subscription_active:  shop.subscription_active,
      upi_id:               shop.upi_id,
      upi_name:             shop.upi_name,
      createdAt:            shop.createdAt,
    });
  } catch (error) {
    console.error("getShopDetails error:", error.message);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * UPDATE SHOP DETAILS (OWNER ONLY)
 * Only whitelisted fields are updated — prevents mass assignment.
 */
export const updateShopDetails = async (req, res) => {
  try {
    const ALLOWED_FIELDS = [
      'shop_name', 'category', 'address', 'owner_phone',
      'gstin', 'pan',
      'bank_name', 'bank_branch', 'bank_account_number', 'bank_ifsc',
      'authorized_signatory', 'terms_and_conditions',
      'upi_id', 'upi_name',
    ];

    const updateData = {};
    for (const field of ALLOWED_FIELDS) {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    }

    // Handle signature image separately — size check required
    if (req.body.signature_image !== undefined && req.body.signature_image !== '') {
      const sizeInMB = req.body.signature_image.length / (1024 * 1024);
      if (sizeInMB > 1.5) {
        return res.status(400).json({
          error: 'Signature image is too large. Please use an image smaller than 1MB.',
        });
      }
      updateData.signature_image = req.body.signature_image;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    await Shop.update(updateData, { where: { id: req.shop.id } });

    res.json({ message: "Shop updated successfully" });
  } catch (error) {
    console.error("updateShopDetails error:", error.message);
    res.status(500).json({
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};
