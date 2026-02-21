// Quick fix for payment_mode ENUM
import mysql from 'mysql2/promise';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

const fixEnum = async () => {
  try {
    console.log('🔄 Attempting to connect to database...');
    console.log('   Host: localhost');
    console.log('   User: root');
    console.log('   Database: stock_management');
    console.log('');
    
    // Try without password first
    let connection;
    try {
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'stock_management'
      });
      console.log('✅ Connected without password!');
    } catch (err) {
      if (err.code === 'ER_ACCESS_DENIED_ERROR') {
        console.log('❌ Access denied without password');
        const password = await question('Enter MySQL root password: ');
        connection = await mysql.createConnection({
          host: 'localhost',
          user: 'root',
          password: password,
          database: 'stock_management'
        });
        console.log('✅ Connected with password!');
      } else {
        throw err;
      }
    }

    console.log('🔄 Updating payment_mode ENUM...');

    await connection.query(`
      ALTER TABLE Payments 
      MODIFY COLUMN payment_mode ENUM('cash', 'upi', 'card', 'credit', 'mixed') NOT NULL;
    `);

    console.log('✅ Payment mode ENUM updated successfully!');
    console.log('   New values: cash, upi, card, credit, mixed');
    
    await connection.end();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    rl.close();
    process.exit(1);
  }
};

fixEnum();
