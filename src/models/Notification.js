const {DataTypes,Model} = require("sequelize"); 

class Notification extends Model{
    static initModel(s){
        Notification.init({
            userId: DataTypes.INTEGER,
            customerId: DataTypes.INTEGER,
            driverId: DataTypes.INTEGER,
            channel: {type: DataTypes.ENUM("IN_APP","EMAIL","SMS","WHATSAPP"), defaultValue: "IN_APP"},
            title: {type: DataTypes.STRING, allowNull: false},
            message: {type: DataTypes.TEXT, allowNull: false},
            status:{type: DataTypes.ENUM("PENDING","SENT","FAILED"), defaultValue: "PENDING"},
            sentAt: DataTypes.DATE
        },{sequelize: s,modelName: "Notification",tableName: "notifications",timestamps: true});
        return Notification;
    }
} 

module.exports = Notification;