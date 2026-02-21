// src/models/productmodel.js

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Product = sequelize.define("Product", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
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
    type: DataTypes.STRING, // Changed from INTEGER to STRING to allow text like "10 kg", "5 pieces"
    allowNull: false,
  },

  stock_unit: {
    type: DataTypes.STRING, // Unit like "kg", "pieces", "liters", etc.
    allowNull: true,
    defaultValue: 'pieces',
  },

  low_stock_threshold: {
    type: DataTypes.INTEGER, // Customizable threshold for each product
    allowNull: true,
    defaultValue: 10,
  },

  storage_location: {
    type: DataTypes.STRING, // Rack/Godown location (e.g., "Rack A-5", "Godown 2", "Section B12")
    allowNull: true,
    defaultValue: null,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  }
}, {
  indexes: [
    { fields: ['shop_id'] },
    { fields: ['product_name'] },
    { fields: ['shop_id', 'stock_quantity'] }
  ]
});

// ✅ CORRECT RELATION DEFINITIONS
Product.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Product, { foreignKey: "shop_id" });

export default Product;