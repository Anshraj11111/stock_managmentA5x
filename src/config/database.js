// src/config/database.js
import dotenv from "dotenv";
dotenv.config(); // 👈 VERY IMPORTANT

import { Sequelize } from "sequelize";

// Safety guard
if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
  throw new Error("❌ ENV variables not loaded in database.js");
}

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: "mysql",
    logging: false,
  }
);

export default sequelize;