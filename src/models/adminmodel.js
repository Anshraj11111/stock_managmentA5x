import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const Admin = sequelize.define("Admin", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      isEmail: true
    }
  },
  
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  
  role: {
    type: DataTypes.ENUM("super_admin", "support_admin"),
    defaultValue: "support_admin",
  },
  
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
}, {
  timestamps: true,
  indexes: [
    { fields: ['email'] },
    { fields: ['role'] },
    { fields: ['is_active'] }
  ]
});

export default Admin;
