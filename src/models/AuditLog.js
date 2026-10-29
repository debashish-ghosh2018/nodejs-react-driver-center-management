const {DataTypes,Model}=require("sequelize"); 

class AuditLog extends Model{
    static initModel(s){
        AuditLog.init({
            userId: DataTypes.INTEGER,
            action: {type:DataTypes.STRING,allowNull:false},
            entity: DataTypes.STRING,
            entityId: DataTypes.INTEGER,
            details: DataTypes.JSON,
            ipAddress: DataTypes.STRING
        },{sequelize: s,modelName: "AuditLog",tableName: "audit_logs",timestamps: true});
        return AuditLog;
    }
} 

module.exports=AuditLog;