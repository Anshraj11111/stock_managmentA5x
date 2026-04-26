// Test script to verify column detection
import { detectColumns } from './src/utils/columnMapper.js';

// Test with sample CSV headers
const sampleHeaders = [
  'Product Name',
  'Purchase Price', 
  'Selling Price',
  'Stock Quantity',
  'Stock Unit',
  'Brand',
  'Category',
  'Size',
  'Storage Location'
];

console.log('🧪 Testing Column Detection\n');
console.log('Input Headers:', sampleHeaders);
console.log('\n');

const mapping = detectColumns(sampleHeaders);

console.log('\n📊 Detection Results:');
console.log('='.repeat(50));
console.log('Column Mapping:', mapping);
console.log('\n');

// Check required fields
const requiredFields = ['product_name', 'purchase_price', 'selling_price', 'stock_quantity'];
const missingFields = requiredFields.filter(field => mapping[field] === undefined);

if (missingFields.length > 0) {
  console.log('❌ FAILED - Missing required fields:', missingFields);
  process.exit(1);
} else {
  console.log('✅ SUCCESS - All required fields detected!');
  console.log('\nMapped Fields:');
  Object.entries(mapping).forEach(([field, index]) => {
    console.log(`  ${field} → Column ${index} (${sampleHeaders[index]})`);
  });
  process.exit(0);
}
