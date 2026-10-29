const { DataTypes, Model } = require("sequelize");

class Vehicle extends Model {
  static initModel(sequelize) {
    Vehicle.init({
      vehicleNo: { type: DataTypes.STRING(30), unique: true, allowNull: false },
      vehicleType: { type: DataTypes.STRING(250), allowNull: false },
      brand: DataTypes.STRING(80),
      model: DataTypes.STRING(80),
      year: DataTypes.INTEGER,
      insuranceExpiry: DataTypes.DATEONLY,
      fitnessExpiry: DataTypes.DATEONLY,
      vehicleTypeId: {type: DataTypes.INTEGER, allowNull: true, references: {model: "vehicle_types", key: "id"}},
      status: { type: DataTypes.ENUM("ACTIVE", "INACTIVE", "MAINTENANCE"), defaultValue: "ACTIVE" },
      isDeleted: { type: DataTypes.TINYINT(1).UNSIGNED, allowNull: false, defaultValue: 0 }
    }, { sequelize, modelName: "Vehicle", tableName: "vehicles", timestamps: true });
    return Vehicle;
  }
}

module.exports = Vehicle;
