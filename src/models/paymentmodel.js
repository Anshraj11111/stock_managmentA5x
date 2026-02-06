import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";
import Bill from "./billmodel.js";

const Payment = sequelize.define("Payment", {
  payment_mode: {
    type: DataTypes.ENUM("cash", "upi", "mixed"),
    allowNull: false,
  },

  amount: {
    type: DataTypes.FLOAT,
    allowNull: false,
  },
});

Payment.belongsTo(Bill, { foreignKey: "bill_id" });
Bill.hasOne(Payment, { foreignKey: "bill_id" });

export default Payment;