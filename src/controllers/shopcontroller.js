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
    gstin: shop.gstin,
    pan: shop.pan,
    bank_name: shop.bank_name,
    bank_branch: shop.bank_branch,
    bank_account_number: shop.bank_account_number,
    bank_ifsc: shop.bank_ifsc,
    authorized_signatory: shop.authorized_signatory,
    signature_image: shop.signature_image,
    terms_and_conditions: shop.terms_and_conditions,
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
    console.log('=== UPDATE SHOP DETAILS ===');
    console.log('Shop ID:', req.shop.id);
    console.log('Request body keys:', Object.keys(req.body));
    
    const { 
      shop_name, 
      category, 
      address, 
      owner_phone, 
      gstin, 
      pan, 
      bank_name,
      bank_branch,
      bank_account_number,
      bank_ifsc,
      authorized_signatory,
      signature_image,
      terms_and_conditions,
      upi_id, 
      upi_name 
    } = req.body;

    // Build update object with only provided fields
    const updateData = {};
    if (shop_name !== undefined) updateData.shop_name = shop_name;
    if (category !== undefined) updateData.category = category;
    if (address !== undefined) updateData.address = address;
    if (owner_phone !== undefined) updateData.owner_phone = owner_phone;
    if (gstin !== undefined) updateData.gstin = gstin;
    if (pan !== undefined) updateData.pan = pan;
    if (bank_name !== undefined) updateData.bank_name = bank_name;
    if (bank_branch !== undefined) updateData.bank_branch = bank_branch;
    if (bank_account_number !== undefined) updateData.bank_account_number = bank_account_number;
    if (bank_ifsc !== undefined) updateData.bank_ifsc = bank_ifsc;
    if (authorized_signatory !== undefined) updateData.authorized_signatory = authorized_signatory;
    
    // Only update signature if it's provided and not empty
    if (signature_image !== undefined && signature_image !== '') {
      updateData.signature_image = signature_image;
    }
    
    if (terms_and_conditions !== undefined) updateData.terms_and_conditions = terms_and_conditions;
    if (upi_id !== undefined) updateData.upi_id = upi_id;
    if (upi_name !== undefined) updateData.upi_name = upi_name;

    console.log('Update data fields:', Object.keys(updateData));
    if (signature_image) {
      console.log('Signature image length:', signature_image.length);
    }

    const [affectedRows] = await Shop.update(updateData, { where: { id: req.shop.id } });
    
    console.log('Affected rows:', affectedRows);
    console.log('=== UPDATE COMPLETE ===');

    res.json({ message: "Shop updated successfully" });
  } catch (error) {
    console.error('=== SHOP UPDATE ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
};
