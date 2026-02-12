// src/models/productmodel.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,   // ✅ FIXED
    primaryKey: true,
  },

  product_name: {
    type: DataTypes.STRING,
    allowNull: false,
  },

  purchase_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  selling_price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  stock_quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
});

// ✅ CORRECT RELATION DEFINITIONS
Product.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Product, { foreignKey: "shop_id" });

export default Product;