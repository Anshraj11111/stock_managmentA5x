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
    console.log('📥 Upload request received');
    console.log('📥 User:', req.user ? 'Authenticated' : 'Not authenticated');
    console.log('📥 File:', req.file ? 'Present' : 'Missing');
    
    if (!req.file) {
      console.log('❌ No file in request');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const shopId = req.user.shop_id;
    console.log('📥 Shop ID:', shopId);

    console.log('📁 File received:', {
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    // Parse the file
    const parsedData = await parseFile(req.file);

    console.log('📊 Parsed data:', {
      fileType: parsedData.fileType,
      headers: parsedData.headers,
      totalRows: parsedData.totalRows
    });

    // Try to parse as invoice/quote first
    const invoiceData = parseInvoiceFile(parsedData);
    
    let columnMapping;
    let headers;
    let rows;
    let isInvoice = false;
    
    if (invoiceData) {
      // Successfully parsed as invoice
      console.log('✅ Using invoice parser');
      columnMapping = invoiceData.columnMapping;
      headers = invoiceData.headers;
      rows = invoiceData.rows;
      isInvoice = true;
    } else {
      // Parse as regular product list
      console.log('📋 Using standard product list parser');
      columnMapping = detectColumns(parsedData.headers);
      headers = parsedData.headers;
      rows = parsedData.rows;
    }

    console.log('🔍 Column mapping detected:', columnMapping);

    // Check if we found required columns
    const requiredFields = ['product_name', 'purchase_price', 'stock_quantity'];
    const missingFields = requiredFields.filter(field => columnMapping[field] === undefined);

    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        message: isInvoice 
          ? 'Could not detect required columns in product table' 
          : 'Could not detect required columns',
        missingFields,
        detectedColumns: columnMapping,
        headers: headers,
        isInvoice,
        suggestion: isInvoice
          ? 'Your invoice was detected but the product table is missing some required columns. Please ensure it has: Description/Item, Price, and Quantity columns.'
          : 'Please ensure your file has columns for: Product Name, Purchase Price, Selling Price, and Stock Quantity'
      });
    }

    // Get existing products for duplicate detection
    const existingProducts = await Product.findAll({
      where: { shop_id: shopId },
      attributes: ['product_name'],
      raw: true
    });

    // Map and validate rows
    const products = [];
    let validCount = 0;
    let errorCount = 0;
    let warningCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Skip empty rows
      if (row.every(cell => !cell || cell === '')) {
        continue;
      }

      // Map row to product
      let product = mapRowToProduct(row, columnMapping);
      
      // For invoices, if selling_price is same as purchase_price, add a margin
      if (isInvoice && product.purchase_price && !product.selling_price) {
        product.selling_price = product.purchase_price;
      }
      if (isInvoice && product.purchase_price === product.selling_price) {
        // Add 20% margin for selling price
        product.selling_price = parseFloat(product.purchase_price) * 1.2;
      }
      
      // Normalize data
      product = normalizeProduct(product);

      // Validate
      const validation = validateProduct(product, existingProducts);

      products.push({
        rowNumber: i + 2, // +2 because: +1 for header, +1 for 1-based indexing
        data: product,
        validation: validation.status,
        errors: validation.errors,
        warnings: validation.warnings
      });

      if (validation.status === 'ok') validCount++;
      if (validation.status === 'error') errorCount++;
      if (validation.status === 'warning') warningCount++;
    }

    res.json({
      success: true,
      message: isInvoice 
        ? 'Invoice parsed successfully! Product table extracted.' 
        : 'File parsed successfully',
      fileInfo: {
        fileName: parsedData.fileName,
        fileType: parsedData.fileType,
        totalRows: rows.length,
        isInvoice,
        warning: parsedData.warning
      },
      columnMapping,
      detectedHeaders: headers,
      summary: {
        total: products.length,
        valid: validCount,
        errors: errorCount,
        warnings: warningCount
      },
      products
    });

  } catch (error) {
    console.error('❌ Upload error:', error);
    console.error('❌ Error stack:', error.stack);
    
    // Special handling for PDF errors
    if (error.message && error.message.includes('PDF parsing')) {
      return res.status(400).json({ 
        message: 'PDF Import Not Available',
        error: error.message,
        suggestion: 'Please convert your PDF to Excel or CSV format for import.'
      });
    }
    
    res.status(500).json({ 
      message: 'Failed to process file', 
      error: error.message 
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
      return res.status(400).json({ message: 'No products to import' });
    }

    const results = {
      success: 0,
      failed: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    for (const item of products) {
      try {
        const productData = {
          ...item.data,
          shop_id: shopId
        };

        // Check if product exists
        const existing = await Product.findOne({
          where: {
            product_name: productData.product_name,
            shop_id: shopId
          },
          transaction
        });

        if (existing) {
          // Handle duplicate based on options
          if (options.duplicateAction === 'update') {
            // Update stock quantity (add to existing)
            const newStock = parseFloat(existing.stock_quantity) + parseFloat(productData.stock_quantity);
            await existing.update({
              stock_quantity: newStock.toString(),
              purchase_price: productData.purchase_price,
              selling_price: productData.selling_price
            }, { transaction });
            results.updated++;
          } else if (options.duplicateAction === 'replace') {
            // Replace entire product
            await existing.update(productData, { transaction });
            results.updated++;
          } else {
            // Skip
            results.skipped++;
          }
        } else {
          // Create new product
          await Product.create(productData, { transaction });
          results.success++;
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          product: item.data.product_name,
          error: error.message
        });
      }
    }

    await transaction.commit();

    res.json({
      success: true,
      message: 'Import completed',
      results
    });

  } catch (error) {
    await transaction.rollback();
    console.error('Import error:', error);
    res.status(500).json({ 
      message: 'Import failed', 
      error: error.message 
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
      ['Sugar White', '40', '50', '200', 'kg', 'Parry', 'Groceries', '1kg', 'Rack A-2'],
      ['Cooking Oil', '150', '180', '50', 'liters', 'Fortune', 'Groceries', '1L', 'Rack B-1']
    ];

    if (format === 'csv') {
      const csvContent = sampleData.map(row => row.join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=product_import_template.csv');
      res.send(csvContent);
    } else {
      // For Excel, you would use xlsx library
      res.status(400).json({ message: 'Excel template not implemented yet' });
    }

  } catch (error) {
    res.status(500).json({ message: 'Failed to generate template', error: error.message });
  }
};
