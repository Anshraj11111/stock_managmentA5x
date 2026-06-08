import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Quotation from "./quotationModel.js";
import Product from "./productmodel.js";

const QuotationItem = sequelize.define("QuotationItem", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  quotation_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "Quotations",
      key: "id",
    },
  },

  // product_id is optional — allows free-text items too
  product_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    references: {
      model: "Products",
      key: "id",
    },
  },

  // Free-text name (used if product_id is null)
  item_name: {
    type: DataTypes.STRING(200),
    allowNull: false,
  },

  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null,
  },

  quantity: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 1,
  },

  unit: {
    type: DataTypes.STRING(30),
    allowNull: true,
    defaultValue: "pcs",
  },

  price: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  total: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
}, {
  tableName: "QuotationItems",
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ["quotation_id"] },
    { fields: ["product_id"] },
  ],
});

// Relations
QuotationItem.belongsTo(Quotation, { foreignKey: "quotation_id" });
QuotationItem.belongsTo(Product, { foreignKey: "product_id", as: "Product" });
Quotation.hasMany(QuotationItem, { foreignKey: "quotation_id", as: "items" });

export default QuotationItem;
