const {DataTypes,Model} = require("sequelize"); 

class Rating extends Model{
    static initModel(s){
        Rating.init({
            bookingId: {type: DataTypes.INTEGER, allowNull: false},
            customerId: {type: DataTypes.INTEGER, allowNull: false},
            driverId: {type: DataTypes.INTEGER, allowNull: false},
            rating: {type: DataTypes.INTEGER, allowNull: false, validate: {min:1,max:5}},
            comment: DataTypes.TEXT
        },{sequelize: s,modelName: "Rating",tableName: "ratings",timestamps: true});
        return Rating;
    }
} 

module.exports = Rating;