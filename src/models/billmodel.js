import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Bill = sequelize.define("Bill", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },

  payment_status: {
    type: DataTypes.ENUM("paid", "unpaid"),
    defaultValue: "unpaid",
  },

  

paid_amount: {
  type: DataTypes.FLOAT,
  defaultValue: 0,
},

due_amount: {
  type: DataTypes.FLOAT,
  defaultValue: 0,
},

status: {
  type: DataTypes.ENUM("paid", "partial", "unpaid", "cancelled"),
  defaultValue: "unpaid",
},



});

Bill.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Bill, { foreignKey: "shop_id" });

export default Bill;