const { Op, fn, col, literal } = require("sequelize");
const { Customer, Driver, Vehicle, VehicleType, Booking, Payment } = require("../models");

exports.index = async (req, res, next) => {
  try {
    const [
      customers,
      drivers,
      availableDrivers,
      vehicles,
      VehicleType,
      pendingBookings,
      activeBookings,
      completedBookings,
      revenue
    ] = await Promise.all([
      Customer.count({ where: { isDeleted: 0 } }),
      Driver.count({ where: { isDeleted: 0 } }),
      Driver.count({ where: { isDeleted: 0, availability: "AVAILABLE", status: "ACTIVE" } }),
      Vehicle.count({ where: { isDeleted: 0 } }),
      Booking.count({ where: { status: "PENDING" } }),
      Booking.count({ where: { status: ["CONFIRMED","ASSIGNED","ACCEPTED","STARTED"] } }),
      Booking.count({ where: { status: "COMPLETED" } }),
      Payment.sum("amount", { where: { paymentStatus: "PAID" } })
    ]);

    res.json({customers, drivers, availableDrivers, vehicles, pendingBookings, activeBookings, completedBookings,  revenue: Number(revenue || 0)});
  } catch (e) { 
    next(e); 
  }
};
