const { DataTypes, Model } = require("sequelize");

class Booking extends Model {
  static initModel(sequelize) {
    Booking.init({
      id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
      bookingNo: { type: DataTypes.STRING(50), allowNull: false, unique: true },
      customerId: { type: DataTypes.INTEGER, allowNull: false },
      driverId: { type: DataTypes.INTEGER, allowNull: true },
      vehicleId: { type: DataTypes.INTEGER, allowNull: true },
      tripCategory: { type: DataTypes.ENUM("LOCAL","OUTSTATION"), allowNull: false, defaultValue: "LOCAL" },
      bookingType: { type: DataTypes.ENUM("ONE_WAY", "ROUND_TRIP", "HOURLY"), defaultValue: "ONE_WAY" },
      pickupLocation: { type: DataTypes.STRING(255), allowNull: false },
      dropLocation: { type: DataTypes.STRING(255), allowNull: false },
      pickupDate: { type: DataTypes.DATEONLY, allowNull: false },
      pickupTime: { type: DataTypes.TIME, allowNull: false },
      returnDate: { type: DataTypes.DATEONLY, allowNull: true },     
      returnTime: { type: DataTypes.TIME, allowNull: true }, 
      estimatedDistanceKm: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
      estimatedDays: { type: DataTypes.INTEGER, allowNull: true },
      vehicleType: { type: DataTypes.STRING(100), allowNull: true },
      baseFare: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      driverAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      nightAllowance: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      tollCharges: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      parkingCharges: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      stateTax: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      otherCharges: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      discountAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      fare: { type: DataTypes.DECIMAL(12,2), allowNull: false, defaultValue: 0 },
      driverCommissionType: { type: DataTypes.ENUM("PERCENTAGE", "FIXED"), allowNull: false, defaultValue: "PERCENTAGE" },
      driverCommissionRate: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
      driverCommissionAmount: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      driverCommissionIncludeAllowances: {type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false},
      driverNetEarning: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
      status: { type: DataTypes.ENUM("PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED", "CANCELLED"), allowNull: false, defaultValue: "PENDING" },
      remarks: { type: DataTypes.TEXT, allowNull: true }
    }, { sequelize, modelName: "Booking", tableName: "bookings", timestamps: true });
    return Booking;
  }
}

module.exports = Booking;
