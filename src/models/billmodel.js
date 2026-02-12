// import { DataTypes } from "sequelize";
// import sequelize from "../config/database.js";
// import Shop from "./shopmodel.js";

// const Bill = sequelize.define("Bill", {
//   id: {
//     type: DataTypes.INTEGER,
//     autoIncrement: true,
//     primaryKey: true,
//   },

//   total_amount: {
//     type: DataTypes.FLOAT,
//     allowNull: false,
//   },

//   payment_status: {
//     type: DataTypes.ENUM("paid", "unpaid"),
//     defaultValue: "unpaid",
//   },

  

// paid_amount: {
//   type: DataTypes.FLOAT,
//   defaultValue: 0,
// },

// due_amount: {
//   type: DataTypes.FLOAT,
//   defaultValue: 0,
// },

// status: {
//   type: DataTypes.ENUM("paid", "partial", "unpaid", "cancelled"),
//   defaultValue: "unpaid",
// },



// });

// Bill.belongsTo(Shop, { foreignKey: "shop_id" });
// Shop.hasMany(Bill, { foreignKey: "shop_id" });

// export default Bill;

import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Shop from "./shopmodel.js";

const Bill = sequelize.define("Bill", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },

  bill_number: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },

  total_amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
    defaultValue: 0,
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
    type: DataTypes.ENUM("PAID", "PARTIAL", "UNPAID", "CANCELLED"),
    defaultValue: "PAID",
  },

  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },

  shop_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
});

Bill.belongsTo(Shop, { foreignKey: "shop_id" });
Shop.hasMany(Bill, { foreignKey: "shop_id" });

export default Bill;
