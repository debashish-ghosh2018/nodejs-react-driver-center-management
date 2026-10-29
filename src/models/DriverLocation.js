const {DataTypes,Model} = require("sequelize"); 

class DriverLocation extends Model{
    static initModel(s){
        DriverLocation.init({
            driverId: {type: DataTypes.INTEGER, allowNull: false},
            latitude: {type: DataTypes.DECIMAL(10,7), allowNull: false},
            longitude: {type: DataTypes.DECIMAL(10,7), allowNull: false},
            accuracy: DataTypes.DECIMAL(10,2),
            recordedAt: {type: DataTypes.DATE, defaultValue: DataTypes.NOW}
        },{sequelize: s, modelName: "DriverLocation", tableName: "driver_locations", timestamps: false});
        return DriverLocation;
    }
} 

module.exports = DriverLocation;