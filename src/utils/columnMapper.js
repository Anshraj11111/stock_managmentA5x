// Smart column detection and mapping

const columnPatterns = {
  product_name: [
    'product', 'item', 'name', 'product name', 'item name', 
    'description', 'product_name', 'item_name', 'productname',
    'product description', 'goods', 'article', 'commodity'
  ],
  purchase_price: [
    'price', 'cost', 'rate', 'purchase', 'purchase price', 
    'purchase_price', 'cost price', 'buying price', 'mrp',
    'buy price', 'buying', 'cp', 'purchaseprice'
  ],
  selling_price: [
    'selling', 'selling price', 'selling_price', 'sale price',
    'retail price', 'sp', 'sale', 'sell price', 'sellingprice',
    'retail', 'sales price'
  ],
  stock_quantity: [
    'qty', 'quantity', 'stock', 'pcs', 'units', 'pieces',
    'stock_quantity', 'stock quantity', 'available', 'inventory',
    'count', 'amount', 'number'
  ],
  stock_unit: [
    'unit', 'uom', 'unit of measure', 'stock_unit', 'measure'
  ],
  low_stock_threshold: [
    'threshold', 'min stock', 'minimum', 'low stock', 'reorder'
  ],
  storage_location: [
    'location', 'storage', 'rack', 'godown', 'warehouse', 'bin'
  ],
  expiry_date: [
    'expiry', 'expiry date', 'exp date', 'expiration', 'best before'
  ],
  date_added: [
    'date', 'added date', 'purchase date', 'date added', 'entry date'
  ],
  sub_category: [
    'category', 'sub category', 'type', 'classification', 'group'
  ],
  size: [
    'size', 'dimension', 'variant'
  ],
  brand_name: [
    'brand', 'manufacturer', 'company', 'brand name'
  ]
};

/**
 * Detect column mapping from headers
 */
export const detectColumns = (headers) => {
  const mapping = {};
  const normalizedHeaders = headers.map(h => 
    h ? h.toString().toLowerCase().trim() : ''
  );

  console.log('🔍 Detecting columns from headers:', normalizedHeaders);

  // Try to match each header to a known field
  normalizedHeaders.forEach((header, index) => {
    for (const [field, patterns] of Object.entries(columnPatterns)) {
      if (patterns.some(pattern => header.includes(pattern))) {
        if (!mapping[field]) { // Take first match only
          mapping[field] = index;
          console.log(`✅ Matched "${header}" → ${field} (column ${index})`);
        }
      }
    }
  });

  console.log('📊 Final column mapping:', mapping);

  return mapping;
};

/**
 * Map row data to product fields
 */
export const mapRowToProduct = (row, columnMapping) => {
  const product = {};

  for (const [field, columnIndex] of Object.entries(columnMapping)) {
    const value = row[columnIndex];
    
    if (value !== undefined && value !== null && value !== '') {
      product[field] = value;
    }
  }

  return product;
};

/**
 * Validate product data
 */
export const validateProduct = (product, existingProducts = []) => {
  const errors = [];
  const warnings = [];

  // Required fields
  if (!product.product_name || product.product_name.toString().trim() === '') {
    errors.push('Product name is required');
  }

  if (!product.purchase_price || isNaN(parseFloat(product.purchase_price))) {
    errors.push('Valid purchase price is required');
  }

  // Selling price is optional if purchase price exists (will be auto-calculated)
  if (product.selling_price && isNaN(parseFloat(product.selling_price))) {
    errors.push('Valid selling price is required');
  }

  if (!product.stock_quantity) {
    errors.push('Stock quantity is required');
  }

  // Check for duplicates
  if (product.product_name) {
    const duplicate = existingProducts.find(
      p => p.product_name.toLowerCase().trim() === 
           product.product_name.toString().toLowerCase().trim()
    );
    
    if (duplicate) {
      warnings.push(`Product "${product.product_name}" already exists`);
    }
  }

  // Validate price logic
  if (product.purchase_price && product.selling_price) {
    const purchasePrice = parseFloat(product.purchase_price);
    const sellingPrice = parseFloat(product.selling_price);
    
    if (sellingPrice < purchasePrice) {
      warnings.push('Selling price is less than purchase price');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    status: errors.length > 0 ? 'error' : warnings.length > 0 ? 'warning' : 'ok'
  };
};

/**
 * Clean and normalize product data
 */
export const normalizeProduct = (product) => {
  const normalized = { ...product };

  // Trim strings
  if (normalized.product_name) {
    normalized.product_name = normalized.product_name.toString().trim();
  }

  // Parse numbers
  if (normalized.purchase_price) {
    normalized.purchase_price = parseFloat(normalized.purchase_price);
  }

  if (normalized.selling_price) {
    normalized.selling_price = parseFloat(normalized.selling_price);
  }

  // If no selling price, calculate from purchase price with 20% margin
  if (normalized.purchase_price && !normalized.selling_price) {
    normalized.selling_price = normalized.purchase_price * 1.2;
  }

  // Handle stock quantity (can be string like "10 kg")
  if (normalized.stock_quantity) {
    normalized.stock_quantity = normalized.stock_quantity.toString().trim();
  }

  // Set defaults
  if (!normalized.stock_unit) {
    normalized.stock_unit = 'pieces';
  }

  if (!normalized.low_stock_threshold) {
    normalized.low_stock_threshold = 10;
  }

  return normalized;
};
