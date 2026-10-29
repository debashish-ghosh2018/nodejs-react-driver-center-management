const { DataTypes, Model } = require("sequelize");  // Details :: Sequelize is an easy-to-use and promise-based Node.js ORM tool for Postgres, MySQL, MariaDB, SQLite, DB2, Microsoft SQL Server, and Snowflake. It features solid transaction support, relations, eager and lazy loading, read replication and more, Url :: https://www.npmjs.com/package/sequelize

class Customer extends Model {
  static initModel(sequelize) {
    Customer.init({
      userId: { type: DataTypes.INTEGER, allowNull: true, unique: true },
      customerCode: { type: DataTypes.STRING(30), unique: true },
      name: { type: DataTypes.STRING(120), allowNull: false },
      mobile: { type: DataTypes.STRING(20), allowNull: false },
      email: { type: DataTypes.STRING(160), validate: { isEmail: true } },
      address: DataTypes.TEXT,
      city: DataTypes.STRING(80),
      state: DataTypes.STRING(80),
      pincode: DataTypes.STRING(10),
      status: { type: DataTypes.ENUM("ACTIVE", "INACTIVE"), defaultValue: "ACTIVE" },
      isDeleted: { type: DataTypes.TINYINT(1).UNSIGNED, allowNull: false, defaultValue: 0 }
    }, { sequelize, modelName: "Customer", tableName: "customers", timestamps: true });
    return Customer;
  }
}

module.exports = Customer;
