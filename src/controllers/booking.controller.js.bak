const { sequelize, Booking, Customer, Driver, Vehicle, DriverEarning, Notification, AuditLog } = require("../models");
const {applyDefaultCommission,calculateFare,calculateCommission} = require("../services/commission.service");
const {notifyBookingCreated,notifyDriverAssigned,notifyStatusChanged} = require("../services/bookingNotification.service");

/*
exports.list = async (req, res, next) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;

    const rows = await Booking.findAll({
      include: [
        { model: Customer, attributes: ["id", "name", "mobile"] },
        { model: Driver, attributes: ["id", "name", "mobile", "rating"] },
        { model: Vehicle, attributes: ["id", "vehicleNo", "vehicleType"] }
      ],
      where,
      order: [["id", "DESC"]]
    });
    res.json(rows);
  } catch (e) { next(e); }
};
*/

function decimal(value) {
  return Number(value || 0);
}

exports.list = async (req, res, next) => {
    try {
      const where = {};

      if (req.user.role === "CUSTOMER") {
        if (!req.user.customerId) {
          return res.status(403).json({ message: "Customer profile is not linked" });
        }
        where.customerId = req.user.customerId;
      }

      if (req.user.role === "DRIVER") {
        if (!req.user.driverId) {
          return res.status(403).json({message: "Driver profile is not linked"});
        }
        where.driverId = req.user.driverId;
      }

      const rows = await Booking.findAll({
        where, 
        include: [
          {model: Customer, attributes: ["id", "name", "mobile"]}, 
          {model: Driver, attributes: ["id", "name", "mobile", "rating"]}, 
          {model: Vehicle, attributes: ["id", "vehicleNo", "vehicleType"]}
        ], 
        order: [["id", "DESC"]]
      });
      res.json(rows);
    } catch (error) {
      next(error);
    }
};

exports.get = async (req, res, next) => {
  try {
    const row = await Booking.findByPk(req.params.id, {
      include: [Customer, Driver, Vehicle]
    });
    if (!row) return res.status(404).json({ message: "Booking not found" });
    res.json(row);
  } catch (e) { next(e); }
};

exports.create = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {customerId, tripCategory = "LOCAL", bookingType = "ONE_WAY", pickupLocation, dropLocation, pickupDate, pickupTime, returnDate, returnTime, estimatedDistanceKm, estimatedDays, vehicleType, baseFare = 0, driverAllowance = 0, nightAllowance = 0, tollCharges = 0, parkingCharges = 0, stateTax = 0, otherCharges = 0, discountAmount = 0, remarks} = req.body;
    
    if (!customerId || !pickupLocation || !dropLocation || !pickupDate || !pickupTime) {
      return res.status(400).json({ message: "Customer, pickup, drop, date and time are required" });
    }

    const customer = await Customer.findByPk(customerId,{transaction});
    if (!customer) {
      await transaction.rollback();
      return res.status(404).json({message: "Customer not found"});
    }

    /*
     * Validate outstation.
     */
    if (tripCategory === "OUTSTATION" && bookingType === "ROUND_TRIP" && !returnDate) {
      await transaction.rollback();
      return res.status(400).json({message: "Return date is required for an outstation round trip"});
    }

    const fareData = {
      baseFare: decimal(baseFare),
      driverAllowance: decimal(driverAllowance),
      nightAllowance: decimal(nightAllowance),
      tollCharges: decimal(tollCharges),
      parkingCharges: decimal(parkingCharges),
      stateTax: decimal(stateTax),
      otherCharges: decimal(otherCharges),
      discountAmount: decimal(discountAmount)
    };


    //body.bookingNo ||= `BK-${Date.now()}`;
    //const booking = await Booking.create(body);
    //res.status(201).json(booking);    

    /*
     * Apply current system default
     * commission and snapshot it.
     */
    const commission = await applyDefaultCommission(fareData);

    const booking = await Booking.create({
      bookingNo: `BK-${Date.now()}`,
      customerId,
      tripCategory,
      bookingType,
      pickupLocation,
      dropLocation,
      pickupDate,
      pickupTime,
      returnDate: tripCategory === "OUTSTATION" ? returnDate || null : null,
      returnTime: tripCategory === "OUTSTATION" ? returnTime || null : null,
      estimatedDistanceKm: tripCategory === "OUTSTATION" ? estimatedDistanceKm || null : null,
      estimatedDays: tripCategory === "OUTSTATION" ? estimatedDays || null : null,
      vehicleType,
      ...fareData,
      fare: commission.fare,
      driverCommissionType: commission.driverCommissionType,
      driverCommissionRate: commission.driverCommissionRate,
      driverCommissionAmount: commission.driverCommissionAmount,
      driverNetEarning: commission.driverNetEarning,
      status: "PENDING",
      remarks
    }, {transaction});

    await transaction.commit();

    /*
     * Do not allow notification
     * failures to roll back booking.
     */
    notifyBookingCreated(booking).catch(console.error);
  
    return res.status(201).json({message: "Booking created successfully", booking});
  } catch (e) { 
    await transaction.rollback();
    next(e); 
  }
};

exports.update = async (req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const allowedFields = ["customerId","tripCategory","bookingType","pickupLocation","dropLocation","pickupDate","pickupTime","returnDate","returnTime","estimatedDistanceKm","estimatedDays","vehicleType","baseFare","driverAllowance","nightAllowance","tollCharges","parkingCharges","stateTax","otherCharges","discountAmount","remarks"];

    const changes = {};
    allowedFields.forEach(field => { 
      if (req.body[field] !== undefined) {
          changes[field] = req.body[field];
      }
    });

    /*
     * Clear outstation-only fields
     * when changing booking back
     * to LOCAL.
     */
    if (changes.tripCategory === "LOCAL") {
      changes.returnDate = null;
      changes.returnTime = null;
      changes.estimatedDistanceKm = null;
      changes.estimatedDays = null;
    }

    /*
     * Calculate fare again.
     */
    const fareSource = {...booking.get({plain: true}), ...changes};
    const fare = calculateFare(fareSource);

    /*
     * Preserve booking's existing
     * commission RATE and TYPE.
     *
     * We recalculate the amount using
     * the original snapshot instead
     * of current global config.
     */
    const commission = calculateCommission({fare, baseFare: fareSource.baseFare, driverAllowance: fareSource.driverAllowance, nightAllowance: fareSource.nightAllowance, type: booking.driverCommissionType, rate: booking.driverCommissionRate, includeAllowances: false});

    changes.fare = fare;
    changes.driverCommissionAmount = commission.commissionAmount;
    changes.driverNetEarning = commission.driverNetEarning;
    await booking.update(changes);

    if (booking.status === "COMPLETED" && booking.driverId && !(await DriverEarning.findOne({where:{bookingId:booking.id}}))) { 
      const gross=Number(booking.fare||0), commission=+(gross*.20).toFixed(2); 
      await DriverEarning.create({
        driverId:booking.driverId,
        bookingId:booking.id,
        grossFare:gross,
        commissionRate:20,
        commissionAmount:commission,
        netEarning:+(gross-commission).toFixed(2)
      }); 
    }
    await Notification.create({customerId:booking.customerId,driverId:booking.driverId,channel:"IN_APP",title:"Booking updated",message:`${booking.bookingNo} is ${booking.status}`,status:"SENT",sentAt:new Date()});
    
    //res.json(booking);
    return res.json({message: "Booking updated successfully", booking});
  } catch (e) { next(e); }
};

exports.assignDriver = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const { driverId, vehicleId } = req.body;
    const booking = await Booking.findByPk(req.params.id,{transaction});
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const driver = await Driver.findByPk(driverId,{transaction});
    if (!driver) {
      await transaction.rollback();
      return res.status(400).json({ message: "Driver unavailable" });
    }

    if (driver.status !== "ACTIVE") {
      await transaction.rollback();
      return res.status(400).json({ message: "Driver is not active" });
    }

    let vehicle = null;
    if (vehicleId) {
      vehicle = await Vehicle.findByPk(vehicleId,{transaction});
      if (!vehicle){
        await transaction.rollback();
        return res.status(400).json({ message: "Vehicle unavailable" });
      }

      if (vehicle.status !== "ACTIVE"){
        await transaction.rollback();
        return res.status(400).json({ message: "Vehicleis not active" });
      }

      booking.vehicleId = vehicleId;
    }

    //booking.driverId = driverId;
    //booking.status = "ASSIGNED";
    //await booking.save();

    //driver.availability = "BUSY";
    //await driver.save();

    await booking.update({driverId: driver.id, vehicleId: vehicle?.id || null, status: "ASSIGNED"},{transaction});
    await driver.update({availability: "BUSY"}, {transaction});
    await transaction.commit();

    await Notification.create({
      customerId:booking.customerId,
      driverId:driverId,
      channel:"IN_APP",
      title:"Driver assigned",
      message:`Driver assigned to ${booking.bookingNo}`,
      status:"SENT",sentAt:new Date()
    });

    notifyDriverAssigned(booking, driver).catch(console.error);

    //res.json(booking);
    return res.json({message: "Driver assigned successfully", booking});

  } catch (e) { 
    await transaction.rollback();
    next(e); 
  }
};

exports.status = async (req, res, next) => {
  const transaction = await sequelize.transaction();

  try {
    const {status} = req.body;
    const allowed = ["PENDING","CONFIRMED","ASSIGNED","ACCEPTED","STARTED","COMPLETED","CANCELLED"];
    if (!allowed.includes(status)){
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid booking status" });
    } 

    const booking = await Booking.findByPk(req.params.id,{transaction});
    if (!booking){
      await transaction.rollback();
      return res.status(404).json({ message: "Booking not found" });
    } 

    //booking.status = req.body.status;
    //await booking.save();
    await booking.update({status},{transaction});

    if (booking.driverId && ["COMPLETED", "CANCELLED"].includes(booking.status)) {
      //const driver = await Driver.findByPk(booking.driverId);
      //if (driver) {
      //  driver.availability = "AVAILABLE";
      //  await driver.save();
      //}
      await Driver.update({availability:"AVAILABLE"},{where: {id: booking.driverId}, transaction});
    }

    /*
     * Generate earning only once.
     */
    if (status === "COMPLETED" && booking.driverId) {
      await DriverEarning.findOrCreate({where: {bookingId: booking.id}, defaults: {
        driverId: booking.driverId, 
        bookingId: booking.id, 
        grossAmount: booking.fare, 
        commissionAmount: booking.driverCommissionAmount, 
        netAmount: booking.driverNetEarning, 
        status: "PENDING"
      }, transaction});
    }

    await transaction.commit();
    notifyStatusChanged(booking).catch(console.error);

    //res.json(booking);
    return res.json({message: "Booking status updated", booking});

  } catch (e) { 
    await transaction.rollback();
    next(e); 
  }
};

exports.updateBookingCommission = async (req, res, next) => {
  try {
    const {type, rate} = req.body;
    const booking = await Booking.findByPk(req.params.id);

    if (!booking) {
      return res.status(404).json({message: "Booking not found"});
    }

    if (!["PERCENTAGE", "FIXED"].includes(type)) {
      return res.status(400).json({message: "Invalid commission type"});
    }

    const numericRate = Number(rate);

    if (!Number.isFinite(numericRate) || numericRate < 0) {
      return res.status(400).json({message: "Invalid commission value"});
    }

    if (type === "PERCENTAGE" && numericRate > 100) {
      return res.status(400).json({message: "Percentage cannot exceed 100"});
    }

    const commission = calculateCommission({fare: booking.fare, baseFare: booking.baseFare, driverAllowance: booking.driverAllowance, nightAllowance: booking.nightAllowance, type, rate: numericRate});

    await booking.update({driverCommissionType: type, driverCommissionRate: numericRate, driverCommissionAmount: commission.commissionAmount, driverNetEarning: commission.driverNetEarning});

    return res.json({message: "Driver commission updated", commission: {type, rate: numericRate, amount: booking.driverCommissionAmount, driverNetEarning: booking.driverNetEarning}});
  } catch (error) {
    next(error);
  }
};



