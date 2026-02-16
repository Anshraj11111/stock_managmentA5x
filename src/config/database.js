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

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: "mysql",
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
});

export default sequelize;
