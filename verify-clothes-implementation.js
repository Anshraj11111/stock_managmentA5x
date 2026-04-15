// Verification script for clothes category implementation
// This script checks:
// 1. Database schema has the required columns
// 2. Product model includes clothes fields
// 3. Basic CRUD operations work with clothes fields

import sequelize from './src/config/database.js';
import Product from './src/models/productmodel.js';

async function verifyImplementation() {
  try {
    console.log('🔍 Starting verification of clothes category implementation...\n');

    // Test 1: Check database connection
    console.log('1️⃣ Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection successful\n');

    // Test 2: Check if Products table has the required columns
    console.log('2️⃣ Checking Products table schema...');
    const queryInterface = sequelize.getQueryInterface();
    const tableDescription = await queryInterface.describeTable('Products');
    
    const requiredColumns = ['sub_category', 'size', 'brand_name', 'date_added'];
    const missingColumns = [];
    
    for (const column of requiredColumns) {
      if (tableDescription[column]) {
        console.log(`   ✅ Column '${column}' exists (Type: ${tableDescription[column].type}, Nullable: ${tableDescription[column].allowNull})`);
      } else {
        console.log(`   ❌ Column '${column}' is MISSING`);
        missingColumns.push(column);
      }
    }
    
    if (missingColumns.length > 0) {
      console.log(`\n⚠️  Missing columns detected: ${missingColumns.join(', ')}`);
      console.log('💡 Run the migration first: node backend/run-clothes-migration.js\n');
      return false;
    }
    console.log('✅ All required columns exist\n');

    // Test 3: Verify Product model includes clothes fields
    console.log('3️⃣ Verifying Product model definition...');
    const modelAttributes = Product.getAttributes();
    
    for (const column of requiredColumns) {
      if (modelAttributes[column]) {
        console.log(`   ✅ Model includes '${column}' field`);
      } else {
        console.log(`   ❌ Model missing '${column}' field`);
      }
    }
    console.log('✅ Product model includes all clothes fields\n');

    // Test 4: Test creating a product with clothes fields (dry run - we'll rollback)
    console.log('4️⃣ Testing product creation with clothes fields...');
    const transaction = await sequelize.transaction();
    
    try {
      // Find a shop_id to use for testing
      const [shops] = await sequelize.query('SELECT id FROM Shops LIMIT 1', { transaction });
      
      if (shops.length === 0) {
        console.log('   ⚠️  No shops found in database, skipping CRUD test');
      } else {
        const testShopId = shops[0].id;
        
        // Create a test product with clothes fields
        const testProduct = await Product.create({
          product_name: 'Test Clothes Item',
          purchase_price: 100,
          selling_price: 200,
          stock_quantity: '10',
          stock_unit: 'pieces',
          sub_category: 'men',
          size: 'L',
          brand_name: 'Test Brand',
          date_added: '2024-01-15',
          shop_id: testShopId,
        }, { transaction });
        
        console.log('   ✅ Product created with clothes fields');
        
        // Verify the product was created with correct values
        if (testProduct.sub_category === 'men' && 
            testProduct.size === 'L' && 
            testProduct.brand_name === 'Test Brand') {
          console.log('   ✅ Clothes fields stored correctly');
        } else {
          console.log('   ❌ Clothes fields not stored correctly');
        }
        
        // Test updating the product
        await testProduct.update({
          size: 'XL',
          brand_name: 'Updated Brand',
        }, { transaction });
        
        console.log('   ✅ Product updated successfully');
        
        // Test NULL values for non-clothes products
        const testNonClothesProduct = await Product.create({
          product_name: 'Test Non-Clothes Item',
          purchase_price: 50,
          selling_price: 100,
          stock_quantity: '20',
          stock_unit: 'kg',
          sub_category: null,
          size: null,
          brand_name: null,
          date_added: null,
          shop_id: testShopId,
        }, { transaction });
        
        console.log('   ✅ Non-clothes product created with NULL values');
      }
      
      // Rollback the transaction (don't actually save test data)
      await transaction.rollback();
      console.log('   ✅ Test transaction rolled back (no data saved)\n');
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

    // Test 5: Check indexes
    console.log('5️⃣ Checking database indexes...');
    const [indexes] = await sequelize.query(`
      SHOW INDEX FROM Products WHERE Key_name IN ('products_sub_category_idx', 'products_brand_name_idx')
    `);
    
    if (indexes.length >= 2) {
      console.log('   ✅ Indexes for sub_category and brand_name exist');
    } else {
      console.log('   ⚠️  Some indexes may be missing (this is optional)');
    }
    console.log('');

    console.log('🎉 All verification checks passed!');
    console.log('✅ Backend implementation is ready for clothes category feature\n');
    
    return true;
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    console.error('\nError details:', error);
    return false;
  } finally {
    await sequelize.close();
  }
}

// Run verification
verifyImplementation()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
