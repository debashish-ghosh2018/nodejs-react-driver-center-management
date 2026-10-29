"use strict";

module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("vehicle_types", {
            id: {type: Sequelize.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true, allowNull: false},
            code: {type: Sequelize.STRING(30), allowNull: false, unique: true},
            name: {type: Sequelize.STRING(100), allowNull: false},
            description: {type: Sequelize.TEXT, allowNull: true},
            seatingCapacity: {type: Sequelize.INTEGER.UNSIGNED, allowNull: false},
            baseFare: {type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0},
            perKmRate: {type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0},
            isActive: {type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true},
            createdAt: {type: Sequelize.DATE, allowNull: false},
            updatedAt: {type: Sequelize.DATE, allowNull: false},
        });

        await queryInterface.addColumn("Bookings", "vehicleTypeId", {
            type: Sequelize.INTEGER.UNSIGNED,
            allowNull: true,
            references: {model: "vehicle_types", key: "id"},
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
        });
    },

    async down(queryInterface) {
        await queryInterface.removeColumn("Bookings", "vehicleTypeId");
        await queryInterface.dropTable("vehicle_types");
    },
};