import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const BillCounter = sequelize.define("BillCounter", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  
  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Shops',
      key: 'id'
    }
  },
  
  current_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
  },
  
  prefix: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '',
  },
  
  suffix: {
    type: DataTypes.STRING(10),
    allowNull: true,
    defaultValue: '',
  }
}, {
  underscored: true,
  timestamps: true,
  indexes: [
    { fields: ['shop_id'], unique: true }
  ]
});

// Relationships
BillCounter.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasOne(BillCounter, { foreignKey: "shop_id" });

export default BillCounter;