import { parseFile } from '../services/fileParser.js';
import { detectColumns, mapRowToProduct, validateProduct, normalizeProduct } from '../utils/columnMapper.js';
import { parseInvoiceFile } from '../utils/invoiceParser.js';
import Product from '../models/productmodel.js';
import sequelize from '../config/database.js';

/**
 * Upload and parse file
 */
export const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const shopId = req.user.shop_id;

    // Parse the file
    const parsedData = await parseFile(req.file);

    // Try to parse as invoice/quote first
    const invoiceData = parseInvoiceFile(parsedData);

    let columnMapping;
    let headers;
    let rows;
    let isInvoice = false;

    if (invoiceData) {
      columnMapping = invoiceData.columnMapping;
      headers = invoiceData.headers;
      rows = invoiceData.rows;
      isInvoice = true;
    } else {
      columnMapping = detectColumns(parsedData.headers);
      headers = parsedData.headers;
      rows = parsedData.rows;
    }

    // Check if we found required columns
    const requiredFields = ['product_name', 'purchase_price', 'stock_quantity'];
    const missingFields = requiredFields.filter(field => columnMapping[field] === undefined);

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: isInvoice
          ? 'Could not detect required columns in product table'
          : 'Could not detect required columns',
        missingFields,
        detectedColumns: columnMapping,
        headers,
        isInvoice,
        suggestion: isInvoice
          ? 'Invoice detected but product table is missing required columns (Description, Price, Quantity).'
          : 'Please ensure your file has columns for: Product Name, Purchase Price, Selling Price, and Stock Quantity',
      });
    }

    // Get existing products for duplicate detection
    const existingProducts = await Product.findAll({
      where: { shop_id: shopId },
      attributes: ['product_name'],
      raw: true,
    });

    // Map and validate rows
    const products = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.every(cell => !cell || cell === '')) continue;

      let product = mapRowToProduct(row, columnMapping);

      // For invoices, default selling price to purchase price if missing
      if (isInvoice && product.purchase_price && !product.selling_price) {
        product.selling_price = product.purchase_price;
      }
      if (isInvoice && product.purchase_price === product.selling_price) {
        product.selling_price = parseFloat(product.purchase_price) * 1.2;
      }

      product = normalizeProduct(product);
      const validation = validateProduct(product, existingProducts);

      products.push({
        rowNumber: i + 2,
        data: product,
        validation: validation.status,
        errors: validation.errors,
        warnings: validation.warnings,
      });

      if (validation.status === 'ok') validCount++;
      if (validation.status === 'error') errorCount++;
      if (validation.status === 'warning') warningCount++;
    }

    res.json({
      success: true,
      message: isInvoice ? 'Invoice parsed successfully!' : 'File parsed successfully',
      fileInfo: {
        fileName: parsedData.fileName,
        fileType: parsedData.fileType,
        totalRows: rows.length,
        isInvoice,
        warning: parsedData.warning,
      },
      columnMapping,
      detectedHeaders: headers,
      summary: { total: products.length, valid: validCount, errors: errorCount, warnings: warningCount },
      products,
    });
  } catch (error) {
    console.error('Upload error:', error.message);

    if (error.message && error.message.includes('PDF parsing')) {
      return res.status(400).json({
        message: 'PDF Import Not Available',
        suggestion: 'Please convert your PDF to Excel or CSV format for import.',
      });
    }

    res.status(500).json({
      message: 'Failed to process file',
      error: process.env.NODE_ENV === 'production' ? 'File processing failed' : error.message,
    });
  }
};

/**
 * Confirm and import products
 */
export const confirmImport = async (req, res) => {
  const transaction = await sequelize.transaction();

  try {
    const { products, options = {} } = req.body;
    const shopId = req.user.shop_id;

    if (!products || products.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'No products to import' });
    }

    // ✅ Whitelist allowed product fields — prevents mass assignment
    const ALLOWED_PRODUCT_FIELDS = [
      'product_name', 'purchase_price', 'selling_price', 'stock_quantity',
      'stock_unit', 'low_stock_threshold', 'storage_location', 'expiry_date',
      'sub_category', 'size', 'brand_name',
    ];

    const results = { success: 0, failed: 0, updated: 0, skipped: 0, errors: [] };

    for (const item of products) {
      try {
        // Build sanitized product data from whitelist only
        const rawData = item.data || {};
        const productData = { shop_id: shopId };
        for (const field of ALLOWED_PRODUCT_FIELDS) {
          if (rawData[field] !== undefined) {
            productData[field] = rawData[field];
          }
        }

        if (!productData.product_name) {
          results.failed++;
          results.errors.push({ product: 'Unknown', error: 'Missing product name' });
          continue;
        }

        const existing = await Product.findOne({
          where: { product_name: productData.product_name, shop_id: shopId },
          transaction,
        });

        if (existing) {
          if (options.duplicateAction === 'update') {
            const newStock = parseFloat(existing.stock_quantity || 0) + parseFloat(productData.stock_quantity || 0);
            await existing.update({
              stock_quantity: newStock.toString(),
              purchase_price: productData.purchase_price,
              selling_price:  productData.selling_price,
            }, { transaction });
            results.updated++;
          } else if (options.duplicateAction === 'replace') {
            await existing.update(productData, { transaction });
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          await Product.create(productData, { transaction });
          results.success++;
        }
      } catch (error) {
        results.failed++;
        results.errors.push({
          product: item.data?.product_name || 'Unknown',
          error: process.env.NODE_ENV === 'production' ? 'Import failed for this item' : error.message,
        });
      }
    }

    await transaction.commit();
    res.json({ success: true, message: 'Import completed', results });
  } catch (error) {
    await transaction.rollback();
    console.error('Import error:', error.message);
    res.status(500).json({
      message: 'Import failed',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};

/**
 * Download sample template
 */
export const downloadTemplate = async (req, res) => {
  try {
    const { format = 'csv' } = req.query;

    const sampleData = [
      ['Product Name', 'Purchase Price', 'Selling Price', 'Stock Quantity', 'Stock Unit', 'Brand', 'Category', 'Size', 'Storage Location'],
      ['Rice Basmati', '500', '600', '100', 'kg', 'India Gate', 'Groceries', '1kg', 'Rack A-1'],
      ['Sugar White',  '40',  '50',  '200', 'kg', 'Parry',      'Groceries', '1kg', 'Rack A-2'],
      ['Cooking Oil',  '150', '180',  '50',  'liters', 'Fortune', 'Groceries', '1L', 'Rack B-1'],
    ];

    if (format === 'csv') {
      const csvContent = sampleData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=product_import_template.csv');
      return res.send(csvContent);
    }

    res.status(400).json({ message: 'Unsupported format. Use ?format=csv' });
  } catch (error) {
    console.error('Template download error:', error.message);
    res.status(500).json({
      message: 'Failed to generate template',
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
    });
  }
};
