const { DataTypes, Model } = require("sequelize");

class VehicleType extends Model {
  static initModel(sequelize) {
    VehicleType.init({
        id: {type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true},
        code: {type: DataTypes.STRING(30), allowNull: false, unique: true},
        name: {type: DataTypes.STRING(100), allowNull: false, unique: true},
        description: {type: DataTypes.STRING(255), allowNull: true},
        seatingCapacity: {type: DataTypes.INTEGER, allowNull: false, defaultValue: 4},
        baseFare: {type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0},
        perKmRate: {type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0},
        status: {type: DataTypes.ENUM("ACTIVE", "INACTIVE"), defaultValue: "ACTIVE"},
        isDeleted: { type: DataTypes.TINYINT(1).UNSIGNED, allowNull: false, defaultValue: 0 }
    }, { sequelize, modelName: "VehicleType", tableName: "vehicle_types", timestamps: true });
    return VehicleType;
  }
}

module.exports = VehicleType;