const { DataTypes, Model } = require("sequelize");

class Driver extends Model {
  static initModel(sequelize) {
    Driver.init({
      driverCode: { type: DataTypes.STRING(30), unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      mobile: { type: DataTypes.STRING(20), allowNull: false },
      email: { type: DataTypes.STRING(160), validate: { isEmail: true } },
      address: DataTypes.TEXT,
      licenseNo: { type: DataTypes.STRING(80), allowNull: false },
      licenseExpiry: DataTypes.DATEONLY,
      experienceYears: { type: DataTypes.DECIMAL(4,1), defaultValue: 0 },
      rating: { type: DataTypes.DECIMAL(3,2), defaultValue: 0 },
      userId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
      status: { type: DataTypes.ENUM("ACTIVE", "INACTIVE", "SUSPENDED"), defaultValue: "ACTIVE" },
      availability: { type: DataTypes.ENUM("AVAILABLE", "BUSY", "OFFLINE"), defaultValue: "OFFLINE" },
      isDeleted: { type: DataTypes.TINYINT(1).UNSIGNED, allowNull: false, defaultValue: 0 }
    }, { sequelize, modelName: "Driver", tableName: "drivers", timestamps: true });
    return Driver;
  }
}

module.exports = Driver;
