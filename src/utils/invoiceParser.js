// Smart invoice/quote parser
// Detects and extracts product tables from invoice files

/**
 * Detect if a row looks like a product table header
 */
export const isProductTableHeader = (row) => {
  if (!row || row.length === 0) return false;
  
  const normalizedRow = row.map(cell => 
    cell ? cell.toString().toLowerCase().trim() : ''
  );
  
  // Look for common invoice table headers
  const invoiceHeaderPatterns = [
    ['#', 'description', 'price', 'qty'],
    ['sno', 'item', 'rate', 'quantity'],
    ['sr', 'product', 'amount', 'qty'],
    ['no', 'description', 'price', 'quantity'],
    ['item', 'description', 'price', 'qty'],
    ['#', 'item', 'price', 'quantity']
  ];
  
  // Check if row contains at least 3 of these keywords
  const keywords = ['description', 'item', 'product', 'price', 'rate', 'amount', 'qty', 'quantity', '#', 'sno', 'sr', 'no'];
  const matchCount = normalizedRow.filter(cell => 
    keywords.some(keyword => cell.includes(keyword))
  ).length;
  
  return matchCount >= 3;
};

/**
 * Find the product table in invoice data
 */
export const findProductTable = (rows) => {
  let headerRowIndex = -1;
  
  // Search for product table header
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    if (isProductTableHeader(rows[i])) {
      headerRowIndex = i;
      break;
    }
  }
  
  if (headerRowIndex === -1) {
    return null;
  }
  
  // Extract headers and data rows
  const headers = rows[headerRowIndex];
  const dataRows = rows.slice(headerRowIndex + 1).filter(row => 
    row.some(cell => cell !== undefined && cell !== null && cell !== '')
  );
  
  return {
    headers,
    rows: dataRows,
    startRow: headerRowIndex
  };
};

/**
 * Map invoice columns to product fields
 */
export const mapInvoiceColumns = (headers) => {
  const mapping = {};
  const normalizedHeaders = headers.map(h => 
    h ? h.toString().toLowerCase().trim() : ''
  );
  
  console.log('🔍 Mapping invoice columns:', normalizedHeaders);
  
  normalizedHeaders.forEach((header, index) => {
    // Product name / Description
    if (header.includes('description') || header.includes('item') || 
        header.includes('product') || header.includes('name')) {
      if (!mapping.product_name) {
        mapping.product_name = index;
        console.log(`✅ Mapped "${header}" → product_name (column ${index})`);
      }
    }
    
    // Price (use as both purchase and selling price from invoice)
    if (header.includes('price') || header.includes('rate') || 
        header.includes('amount') || header.includes('cost')) {
      if (!mapping.purchase_price) {
        mapping.purchase_price = index;
        mapping.selling_price = index; // Use same price for both initially
        console.log(`✅ Mapped "${header}" → purchase_price & selling_price (column ${index})`);
      }
    }
    
    // Quantity
    if (header.includes('qty') || header.includes('quantity') || 
        header.includes('pcs') || header.includes('units')) {
      if (!mapping.stock_quantity) {
        mapping.stock_quantity = index;
        console.log(`✅ Mapped "${header}" → stock_quantity (column ${index})`);
      }
    }
  });
  
  console.log('📊 Final invoice mapping:', mapping);
  
  return mapping;
};

/**
 * Check if data looks like an invoice/quote
 */
export const looksLikeInvoice = (headers, rows) => {
  // If first row has company info keywords
  const firstRowText = headers.join(' ').toLowerCase();
  const invoiceKeywords = ['address', 'phone', 'email', 'tax id', 'gst', 'our info', 'customer', 'invoice', 'quote'];
  
  const hasInvoiceKeywords = invoiceKeywords.some(keyword => firstRowText.includes(keyword));
  
  // Or if we can find a product table in the data
  const hasProductTable = rows.some(row => isProductTableHeader(row));
  
  return hasInvoiceKeywords || hasProductTable;
};

/**
 * Parse invoice file and extract product data
 */
export const parseInvoiceFile = (parsedData) => {
  console.log('📄 Attempting to parse as invoice/quote file...');
  
  // Check if it looks like an invoice
  if (!looksLikeInvoice(parsedData.headers, parsedData.rows)) {
    console.log('❌ Does not look like an invoice file');
    return null;
  }
  
  console.log('✅ Detected invoice/quote format');
  
  // Find product table
  const allRows = [parsedData.headers, ...parsedData.rows];
  const productTable = findProductTable(allRows);
  
  if (!productTable) {
    console.log('❌ Could not find product table in invoice');
    return null;
  }
  
  console.log(`✅ Found product table at row ${productTable.startRow}`);
  console.log(`✅ Product table headers:`, productTable.headers);
  console.log(`✅ Product rows: ${productTable.rows.length}`);
  
  // Map columns
  const columnMapping = mapInvoiceColumns(productTable.headers);
  
  // Check if we found required fields
  const requiredFields = ['product_name', 'purchase_price', 'stock_quantity'];
  const missingFields = requiredFields.filter(field => columnMapping[field] === undefined);
  
  if (missingFields.length > 0) {
    console.log('❌ Missing required fields in product table:', missingFields);
    return null;
  }
  
  return {
    headers: productTable.headers,
    rows: productTable.rows,
    columnMapping,
    isInvoice: true,
    totalRows: productTable.rows.length
  };
};
