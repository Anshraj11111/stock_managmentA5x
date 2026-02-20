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

import dotenv from "dotenv";
dotenv.config();

import { Sequelize } from "sequelize";

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL missing");
  process.exit(1);
}

// Check if using local database
const isLocal = process.env.DATABASE_URL.includes('localhost');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
  logging: false,
  pool: {
    max: 10,        // Maximum connections in pool
    min: 2,         // Minimum connections in pool
    acquire: 60000, // Max time (ms) to get connection
    idle: 10000     // Max idle time before release
  },
  dialectOptions: isLocal ? {
    // Local database - no SSL
    connectTimeout: 60000,
  } : {
    // Remote database (Railway) - with SSL
    connectTimeout: 60000,
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
  define: {
    charset: 'utf8',
    collate: 'utf8_general_ci'
  }
});

export default sequelize;
