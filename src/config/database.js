// // src/config/database.js

// import dotenv from "dotenv";
// dotenv.config(); // ✅ MUST BE HERE

// import { Sequelize } from "sequelize";

// if (!process.env.MYSQL_PUBLIC_URL) {
//   console.log("Loaded ENV:", process.env.MYSQL_PUBLIC_URL); // debug line
//   throw new Error("❌ MYSQL_PUBLIC_URL missing in ENV");
// }

// const sequelize = new Sequelize(process.env.MYSQL_PUBLIC_URL, {
//   dialect: "mysql",
//   logging: false,
// });

// export default sequelize;
// src/config/database.js

// import dotenv from "dotenv";
// import { fileURLToPath } from 'url';
// import { dirname, join } from 'path';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// // ✅ ONLY load .env.local (priority file)
// dotenv.config({ path: join(__dirname, '../../.env.local') });

// import { Sequelize } from "sequelize";

// if (!process.env.DATABASE_URL) {
//   console.error("❌ DATABASE_URL missing");
//   process.exit(1);
// }

// // ✅ DEBUG: Print what DATABASE_URL we're using
// console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL.substring(0, 50) + '...');

// // Check if using local database
// const isLocal = process.env.DATABASE_URL.includes('localhost');

// const sequelize = new Sequelize(process.env.DATABASE_URL, {
//   dialect: "mysql",
//   logging: false,
//   pool: {
//     max: 10,        // Maximum connections in pool
//     min: 2,         // Minimum connections in pool
//     acquire: 60000, // Max time (ms) to get connection
//     idle: 10000     // Max idle time before release
//   },
//   dialectOptions: isLocal ? {
//     // Local database - no SSL
//     connectTimeout: 60000,
//   } : {
//     // Remote database (Railway) - with SSL
//     connectTimeout: 60000,
//     ssl: {
//       require: true,
//       rejectUnauthorized: false,
//     },
//   },
//   define: {
//     charset: 'utf8',
//     collate: 'utf8_general_ci'
//   }
// });

// export default sequelize;


import dotenv from "dotenv";
import { Sequelize } from "sequelize";

dotenv.config();

if (
  !process.env.MYSQLHOST ||
  !process.env.MYSQLUSER ||
  !process.env.MYSQLPASSWORD ||
  !process.env.MYSQLDATABASE
) {
  console.error("❌ Missing MySQL ENV");
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.MYSQLDATABASE,
  process.env.MYSQLUSER,
  process.env.MYSQLPASSWORD,
  {
    host: process.env.MYSQLHOST,
    port: process.env.MYSQLPORT || 4000,
    dialect: "mysql",
    logging: false,

    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },

    pool: {
      max: 10,
      min: 2,
      acquire: 60000,
      idle: 10000,
    },
  }
);

export default sequelize;