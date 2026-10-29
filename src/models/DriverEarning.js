const {DataTypes,Model} = require("sequelize"); 

class DriverEarning extends Model{
    static initModel(s){
        DriverEarning.init({
            driverId: {type: DataTypes.INTEGER, allowNull: false},
            bookingId: {type: DataTypes.INTEGER, allowNull: false},
            grossFare: {type: DataTypes.DECIMAL(12,2), defaultValue: 0},
            commissionRate: {type: DataTypes.DECIMAL(5,2), defaultValue: 20},
            commissionAmount: {type: DataTypes.DECIMAL(12,2), defaultValue: 0},
            netEarning: {type:DataTypes.DECIMAL(12,2), defaultValue: 0},
            status: {type: DataTypes.ENUM("PENDING","PAID"), defaultValue: "PENDING"}
        },{sequelize: s, modelName: "DriverEarning", tableName: "driver_earnings", timestamps: true});
        return DriverEarning;
    }
} 

module.exports = DriverEarning;