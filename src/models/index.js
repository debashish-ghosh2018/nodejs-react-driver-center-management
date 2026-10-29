const sequelize = require("../config/db");
const User = require("./User"),
    Customer = require("./Customer"),
    Driver = require("./Driver"),
    Vehicle = require("./Vehicle"),
    Booking = require("./Booking"),
    Payment = require("./Payment"),
    Rating = require("./Rating"),
    DriverLocation = require("./DriverLocation"),
    Notification = require("./Notification"),
    AuditLog = require("./AuditLog"),
    DriverEarning = require("./DriverEarning");

// ACL
const Permission = require("./Permission");
const RolePermission = require("./RolePermission");
const AppSetting = require("./AppSetting");
const VehicleType = require("./VehicleType");


[User, Customer, Driver, Vehicle, VehicleType, Booking, Payment, Rating, DriverLocation, Notification, AuditLog, DriverEarning, Permission, RolePermission, AppSetting].forEach(M => M.initModel(sequelize));
Customer.hasMany(Booking, {foreignKey: "customerId", as: "bookings"});
Customer.belongsTo(User, {foreignKey: "userId", as: "user"});
Driver.hasMany(Booking, {foreignKey: "driverId", as:"bookings"});
Driver.hasMany(Rating, {foreignKey: "driverId"});
Driver.hasMany(DriverLocation, {foreignKey: "driverId", as: "locations"});
Driver.hasMany(DriverEarning, {foreignKey: "driverId"});
Driver.belongsTo(User, {foreignKey: "userId", as: "user"});
Booking.belongsTo(Driver, {foreignKey: "driverId", as: "driver"});
Booking.belongsTo(Customer, {foreignKey: "customerId", as: "customer"});
Booking.belongsTo(Vehicle, {foreignKey: "vehicleId", as: "vehicle"});
Booking.hasMany(Payment, {foreignKey: "bookingId"});
Booking.hasMany(Rating, {foreignKey: "bookingId"});
Booking.hasOne(DriverEarning, {foreignKey: "bookingId"});
Booking.belongsTo(VehicleType, {foreignKey: "vehicleTypeId", as: "selectedVehicleType"});
Payment.belongsTo(Booking, {foreignKey: "bookingId", as: "booking"});
Rating.belongsTo(Booking, {foreignKey: "bookingId"});
Rating.belongsTo(Driver, {foreignKey: "driverId"});
DriverLocation.belongsTo(Driver, {foreignKey: "driverId", as: "driver"});
DriverEarning.belongsTo(Driver, {foreignKey: "driverId"});
DriverEarning.belongsTo(Booking, {foreignKey: "bookingId"});
Permission.hasMany(RolePermission, {foreignKey: "permissionId"});
RolePermission.belongsTo(Permission, {foreignKey: "permissionId"});
User.hasOne(Customer, {foreignKey: "userId", as: "customerProfile"});
User.hasOne(Driver, {foreignKey: "userId", as: "driverProfile"});
VehicleType.hasMany(Booking, {foreignKey: "vehicleTypeId", as: "bookings"});
VehicleType.hasMany(Vehicle, {foreignKey: "vehicleTypeId", as: "vehicles"});
Vehicle.hasMany(Booking, {foreignKey: "vehicleId", as: "bookings"});
Vehicle.belongsTo(VehicleType, {foreignKey: "vehicleTypeId", as: "typeDetails"});


module.exports = {
    sequelize,
    User,
    Customer,
    Driver,
    Vehicle,
    VehicleType,
    Booking,
    Payment,
    Rating,
    DriverLocation,
    Notification,
    AuditLog,
    DriverEarning,
    Permission,
    RolePermission,
    AppSetting
};