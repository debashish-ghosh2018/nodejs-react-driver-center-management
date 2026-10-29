"use strict";

const {randomUUID} = require("crypto");
const {Op} = require("sequelize");
const {sequelize, Booking, Customer, Driver, Vehicle, VehicleType, DriverEarning} = require("../models");
const {calculateFare, applyDefaultCommission, calculateCommission} = require("../services/commission.service");
const {notifyBookingCreated, notifyDriverAssigned, notifyStatusChanged} = require("../services/bookingNotification.service");
const { validateBookingVehicleType, httpError } = require("../services/vehicleType.service");
const {getDriverAvailabilityClass} = require("../utils/driverUtils");


/**
 * Booking statuses.
 * Adjust these values to match the ENUM
 * defined in your existing Booking model.
 */
const STATUS = {PENDING: "PENDING", CONFIRMED: "CONFIRMED", ASSIGNED: "ASSIGNED", ACCEPTED: "ACCEPTED", STARTED: "STARTED", COMPLETED: "COMPLETED", CANCELLED: "CANCELLED"};
const CLOSED_STATUSES = [STATUS.COMPLETED, STATUS.CANCELLED];
const CUSTOMER_EDITABLE_STATUSES = [STATUS.PENDING, STATUS.CONFIRMED];
const BOOKING_TYPES = ["ONE_WAY", "ROUND_TRIP", "HOURLY"];

/**
* Shared associations for booking responses.
*/
const bookingIncludes = [
  {model: Customer, attributes: ["id", "name", "mobile", "email"]},
  {model: Driver, attributes: ["id", "name", "mobile", "availability"], required: false},
  {model: Vehicle, attributes: ["id", "vehicleNo", "vehicleTypeId", "brand", "model"], required: false},
  {model: VehicleType, as: "selectedVehicleType", attributes: ["id", "code", "name", "description", "seatingCapacity", "baseFare", "perKmRate", "status"], required: false}
];


/**
* Validate positive integer IDs.
*/
function parseId(value, fieldName, allowNull = false) {
  if (allowNull && (value === null || value === "")) {
    return null;
  }

  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw httpError(400, `${fieldName} must be a valid positive integer`);
  }

  return id;
}

// Not Required for now, but useful for future-proofing.
function hasField(body, field) {
  return Object.prototype.hasOwnProperty.call(body, field);
}

/**
* Get customer profile associated with logged-in user. 
* Not Required for now, but useful for future-proofing.
*/
async function getLoggedInCustomer(userId) {
  const customer = await Customer.findOne({where: { userId }});
  if (!customer) {
    throw httpError(404, "Customer profile not found");
  }

  return customer;
}

/**
* Validate vehicle type.
*/
async function validateVehicleType(vehicleTypeId, transaction) {
  const id = parseId(vehicleTypeId, "vehicleTypeId");
  const vehicleType = await VehicleType.findOne({ where: {id, status: "ACTIVE"}, transaction});

  if (!vehicleType) {
    throw httpError(400, "Selected vehicle type is invalid or inactive");
  }

  return vehicleType;
}

/**
* Validate assigned driver. 
* Not Required for now, but useful for future-proofing.
*/
async function validateDriver(driverId, transaction) {
  if (driverId === null) {
    return null;
  }

  const driver = await Driver.findByPk(driverId, {transaction});

  if (!driver) {
    throw httpError(404, "Selected driver not found");
  }

  if (driver.status !== "ACTIVE") {
    throw httpError(409, "Selected driver is inactive");
  }

  if (driver.availability === "OFFLINE") {
    throw httpError(409, "Selected driver is offline");
  }

  return driver;
}

/**
* Validate assigned vehicle and requested vehicle type.
*/
async function validateVehicle(vehicleId, vehicleTypeId = null, transaction) {
  if (vehicleId === null) {
    return null;
  }

  const vehicle = await Vehicle.findByPk(vehicleId, { transaction });
  if (!vehicle) {
    throw httpError(404, "Selected vehicle not found");
  }

  if (vehicle.status !== "ACTIVE") {
    throw httpError(409, "Selected vehicle is inactive");
  }

  if (vehicleTypeId !== null && Number(vehicle.vehicleTypeId) !== Number(vehicleTypeId)) {
    throw httpError(409, "Selected vehicle does not match the requested vehicle type");
  }

  return vehicle;
}

/**
* Validate booking details. Not Required for now, but useful for future-proofing.
*/
function validateBookingFields(data) {
  if (!data.pickupLocation || !String(data.pickupLocation).trim()) {
    throw httpError(400, "Pickup location is required");
  }

  if (!data.dropLocation || !String(data.dropLocation).trim()) {
    throw httpError(400, "Drop location is required");
  }

  if (!data.pickupDate || !/^\d{4}-\d{2}-\d{2}$/.test(String(data.pickupDate))) {
    throw httpError(400, "Valid pickup date is required");
  }

  if (!data.pickupTime || !/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(String(data.pickupTime))) {
    throw httpError(400, "Valid pickup time is required");
  }

  if (data.bookingType && !BOOKING_TYPES.includes(data.bookingType)) {
    throw httpError(400, "Invalid booking type");
  }
}

/**
* Allow only permitted fields. 
* Not Required for now, but useful for future-proofing.
*/
function extractBookingFields(body) {
  const allowed = ["pickupLocation", "dropLocation", "pickupDate", "pickupTime", "bookingType", "remarks"];
  const data = {};

  for (const field of allowed) {
    if (hasField(body, field)) {
      data[field] = body[field];
    }
  }

  return data;
}

/**
* Resolve booking status from assignments. 
* Not Required for now, but useful for future-proofing.
*/
function resolveAssignmentStatus(booking) {
  if ([STATUS.ACCEPTED, STATUS.STARTED].includes(booking.status)) {
    return booking.status;
  }

  if (booking.driverId !== null || booking.vehicleId !== null) {
    return STATUS.ASSIGNED;
  }

  return STATUS.PENDING;
}

/**
* Load booking with all related details. 
* Not Required for now, but useful for future-proofing.
*/
async function getBookingDetails(id, where = {}) {
  const booking = await Booking.findOne({where: {id, ...where}, include: bookingIncludes});

  if (!booking) {
    throw httpError(404, "Booking not found");
  }

  return booking;
}

/*
 * ============================================================
 * BOOKING NUMBER
 * ============================================================
 */
function generateBookingNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}${month}${day}-${random}`;
}

/*
 * ============================================================
 * NORMALIZE MONEY
 * ============================================================
 */
function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

/*
 * ============================================================
 * GET /api/bookings
 * ============================================================
 *
 * ACL:
 * bookings.view
 *
 * Query support:
 *
 * ?search=
 * ?status=
 * ?tripCategory=
 * ?customerId=
 * ?driverId=
 * ?fromDate=
 * ?toDate=
 * ?page=
 * ?limit=
 */
exports.list = async(req, res, next) => {
  try {
    const {search = "", status = "", tripCategory = "", customerId = "", driverId = "", fromDate = "", toDate = "", page = 1, limit = 20} = req.query;
    const where = {};

    /*
     * CUSTOMER ownership
     */
    if(req.user.role === "CUSTOMER") {
      if(!req.user.customerId) {
        return res.status(403).json({message: "Customer profile is not linked"});
      }
      where.customerId = req.user.customerId;
    }

    /*
     * DRIVER ownership
     */
    if(req.user.role === "DRIVER") {
      if(!req.user.driverId) {
        return res.status(403).json({message: "Driver profile is not linked"});
      }
      where.driverId = req.user.driverId;
    }

    /*
     * Admin filters
     */
    const adminRoles = ["SUPER_ADMIN", "ADMIN", "MANAGER", "STAFF"];
    if(adminRoles.includes(req.user.role)) {
      if(customerId) {
        where.customerId = customerId;
      }
      if(driverId) {
        where.driverId = driverId;
      }
    }
    if(status) {
      where.status = status;
    }
    if(tripCategory) {
      where.tripCategory = tripCategory;
    }

    /*
     * Date range
     */
    if(fromDate || toDate) {
      where.pickupDate = {};
      if(fromDate) {
        where.pickupDate[Op.gte] = fromDate;
      }
      if(toDate) {
        where.pickupDate[Op.lte] = toDate;
      }
    }

    /*
     * Search
     */
    if(search) {
      where[Op.or] = [{
        bookingNo: {
          [Op.like]: `%${search}%`
        }
      }, {
        pickupLocation: {
          [Op.like]: `%${search}%`
        }
      }, {
        dropLocation: {
          [Op.like]: `%${search}%`
        }
      }];
    }

    if (req.query.vehicleTypeId) {
      where.vehicleTypeId = parseId(req.query.vehicleTypeId, "vehicleTypeId" );
    }

    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (currentPage - 1) * pageSize;
    const {count, rows} = await Booking.findAndCountAll({
      where,
      include: [
        {model: Customer, as: "customer", attributes: ["id", "customerCode", "name", "mobile", "email"]}, 
        {model: Driver, as: "driver", required: false, attributes: ["id", "driverCode", "name", "mobile", "availability"]}, 
        {model: Vehicle,as: "vehicle", required: false}
      ],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset
    });
    return res.json({data: rows, pagination: {page: currentPage, limit: pageSize, total: count, totalPages: Math.ceil(count / pageSize)}});
  } catch(error) {
    next(error);
  }
};

/*
 * ============================================================
 * GET /api/bookings/:id
 * ============================================================
 *
 * ACL:
 * bookings.view
 */
exports.get = async(req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id, {
      include: [
        {model: Customer, as: "customer"}, 
        {model: Driver, as: "driver", required: false}, 
        {model: Vehicle, as: "vehicle", required: false}
      ]
    });
    if(!booking) {
      return res.status(404).json({message: "Booking not found"});
    }

    /*
     * Ownership check
     */
    if(req.user.role === "CUSTOMER" && booking.customerId !== req.user.customerId) {
      return res.status(403).json({message: "Access denied"});
    }
    if(req.user.role === "DRIVER" && booking.driverId !== req.user.driverId) {
      return res.status(403).json({message: "Access denied"});
    }
    return res.json(booking);
  } catch(error) {
    next(error);
  }
};

/*
 * ============================================================
 * POST /api/bookings
 * ============================================================
 *
 * ACL:
 * bookings.create
 */
exports.create = async(req, res, next) => {
  const transaction = await sequelize.transaction();
  try {

    //console.log("Creating booking with data:", req.body);
    const {
      customerId,
      tripCategory = "LOCAL",
      bookingType = "ONE_WAY",
      pickupLocation,
      dropLocation,
      pickupDate,
      pickupTime,
      returnDate,
      returnTime,
      estimatedDistanceKm,
      estimatedDays,  //vehicleType, vehicleTypeId,
      vehicleId,
      baseFare = 0,
      driverAllowance = 0,
      nightAllowance = 0,
      tollCharges = 0,
      parkingCharges = 0,
      stateTax = 0,
      otherCharges = 0,
      discountAmount = 0,
      remarks
    } = req.body;

    if(!customerId || !pickupLocation || !dropLocation || !pickupDate || !pickupTime) {
      await transaction.rollback();
      return res.status(400).json({message: "Customer, pickup, drop, pickup date and pickup time are required"});
    }

    const customer = await Customer.findByPk(customerId, {transaction});
    if(!customer) {
      await transaction.rollback();
      return res.status(404).json({message: "Customer not found"});
    }
    if (customer.status !== "ACTIVE") {
      throw httpError(400, "Inactive customer");
    }

    if(tripCategory === "OUTSTATION" && bookingType === "ROUND_TRIP" && !returnDate) {
      await transaction.rollback();
      return res.status(400).json({message: "Return date is required for an outstation round trip"});
    }

    //await validateVehicleType(vehicleTypeId, transaction);
    const vehicleDetails = await validateVehicle(vehicleId, null, transaction);
    
    const bookingData = {
      bookingNo: generateBookingNo(),
      customerId,
      vehicleId: vehicleId || null,
      vehicleTypeId: vehicleDetails.vehicleTypeId || null,
      tripCategory,
      bookingType,
      pickupLocation,
      dropLocation,
      pickupDate,
      pickupTime,
      returnDate: returnDate || null,
      returnTime: returnTime || null,
      estimatedDistanceKm: estimatedDistanceKm || null,
      estimatedDays: estimatedDays || null,
      vehicleType: vehicleDetails.vehicleType || null,
      baseFare: numberValue(baseFare),
      driverAllowance: numberValue(driverAllowance),
      nightAllowance: numberValue(nightAllowance),
      tollCharges: numberValue(tollCharges),
      parkingCharges: numberValue(parkingCharges),
      stateTax: numberValue(stateTax),
      otherCharges: numberValue(otherCharges),
      discountAmount: numberValue(discountAmount),
      remarks: remarks || null,
      status: "PENDING"
    };
    //console.log("Booking data before fare calculation:", bookingData);

    /*
     * Fare
     */
    bookingData.fare = calculateFare(bookingData);

    /*
     * Apply current default
     * driver commission.
     */
    const dataWithCommission = await applyDefaultCommission(bookingData);
    //console.log("Booking data after applying commission:", dataWithCommission);

    const booking = await Booking.create(dataWithCommission, {transaction});
    await transaction.commit();
    /*
     * Notification failure should
     * NOT rollback the booking.
     */
    notifyBookingCreated(booking).catch(console.error);
    return res.status(201).json({message: "Booking created successfully", booking});
  } catch(error) {
    await transaction.rollback();
    next(error);
  }
};

/*
 * ============================================================
 * PUT /api/bookings/:id
 * ============================================================
 *
 * ACL:
 * bookings.update
 *
 * Important:
 * Does NOT assign driver.
 * Does NOT change workflow status.
 *
 * Those use dedicated endpoints.
 */
exports.update = async(req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id);
    if(!booking) {
			await transaction.rollback();
      return res.status(404).json({message: "Booking not found"});
    }

    /*
     * Completed and cancelled
     * bookings shouldn't normally
     * be edited.
     */
    if(["COMPLETED", "CANCELLED"].includes(booking.status)) {
			await transaction.rollback();
      return res.status(409).json({message: "Completed or cancelled bookings cannot be edited"});
    }

    const allowedFields = ["customerId", "tripCategory", "bookingType", "pickupLocation", "dropLocation", "pickupDate", "pickupTime", "returnDate", "returnTime", "estimatedDistanceKm", "estimatedDays", "vehicleType", "baseFare", "driverAllowance", "nightAllowance", "tollCharges", "parkingCharges", "stateTax", "otherCharges", "discountAmount", "remarks", "vehicleTypeId", "vehicleId"];
    const updateData = {};
    allowedFields.forEach(field => {
      if(Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    /*
     * Verify changed customer.
     */
    if(updateData.customerId) {
      const customer = await Customer.findByPk(updateData.customerId);
      if(!customer) {
			  await transaction.rollback();
        return res.status(404).json({message: "Customer not found"});
      }
    }

    /*
     * If switched to LOCAL,
     * clear outstation fields.
     */
    if(updateData.tripCategory === "LOCAL") {
      updateData.returnDate = null;
      updateData.returnTime = null;
      updateData.estimatedDays = null;
    }

    /*
     * Validate outstation roundtrip.
     */
    const finalTripCategory = updateData.tripCategory ?? booking.tripCategory;
    const finalBookingType = updateData.bookingType ?? booking.bookingType;
    const finalReturnDate = Object.prototype.hasOwnProperty.call(updateData, "returnDate") ? updateData.returnDate : booking.returnDate;
    if(finalTripCategory === "OUTSTATION" && finalBookingType === "ROUND_TRIP" && !finalReturnDate) {
			await transaction.rollback();
      return res.status(400).json({message: "Return date is required for an outstation round trip"});
    }

    /*
     * Build final values for
     * recalculation.
     */
    const fareInput = {
      baseFare: numberValue(updateData.baseFare ?? booking.baseFare),
      driverAllowance: numberValue(updateData.driverAllowance ?? booking.driverAllowance),
      nightAllowance: numberValue(updateData.nightAllowance ?? booking.nightAllowance),
      tollCharges: numberValue(updateData.tollCharges ?? booking.tollCharges),
      parkingCharges: numberValue(updateData.parkingCharges ?? booking.parkingCharges),
      stateTax: numberValue(updateData.stateTax ?? booking.stateTax),
      otherCharges: numberValue(updateData.otherCharges ?? booking.otherCharges),
      discountAmount: numberValue(updateData.discountAmount ?? booking.discountAmount)
    };
    const fare = calculateFare(fareInput);
    updateData.fare = fare;

    /*
     * Existing booking keeps its
     * commission type/rate.
     */
    const commission = calculateCommission({
      fare,
      baseFare: fareInput.baseFare,
      driverAllowance: fareInput.driverAllowance,
      nightAllowance: fareInput.nightAllowance,
      type: booking.driverCommissionType,
      rate: numberValue(booking.driverCommissionRate),
      includeAllowances: Boolean(booking.driverCommissionIncludeAllowances)
    });
    updateData.driverCommissionAmount = commission.commissionAmount;
    updateData.driverNetEarning = commission.driverNetEarning;

    await validateVehicleType(updateData.vehicleTypeId, transaction);
    const vehicleDetails = await validateVehicle(updateData.vehicleId, updateData.vehicleTypeId, transaction);
    updateData.vehicleType = vehicleDetails.vehicleType || null;

    await booking.update(updateData, {transaction});
		await transaction.commit();

    return res.json({message: "Booking updated successfully", booking});
  } catch(error) {
		await transaction.rollback();
    next(error);
  }
};

/*
 * ============================================================
 * DELETE /api/bookings/:id
 * ============================================================
 *
 * ACL:
 * bookings.delete
 *
 * Strong recommendation:
 * Only physically delete PENDING
 * bookings with no operational history.
 */
exports.remove = async(req, res, next) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if(!booking) {
      return res.status(404).json({message: "Booking not found"});
    }
    if(booking.status !== "PENDING") {
      return res.status(409).json({message: "Only pending bookings can be deleted. Cancel active bookings instead."});
    }
    await booking.destroy();
    return res.json({message: "Booking deleted successfully"});
  } catch(error) {
    next(error);
  }
};

/*
 * ============================================================
 * POST /api/bookings/:id/assign-driver
 * ============================================================
 *
 * ACL:
 * bookings.assign
 */
exports.assignDriver = async(req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {driverId, vehicleId} = req.body;
    if(!driverId) {
      await transaction.rollback();
      return res.status(400).json({message: "Driver is required"});
    }
    const booking = await Booking.findByPk(req.params.id, {transaction});
    if(!booking) {
      await transaction.rollback();
      return res.status(404).json({message: "Booking not found"});
    }
    if(["COMPLETED", "CANCELLED"].includes(booking.status)) {
      await transaction.rollback();
      return res.status(409).json({message: "Driver cannot be assigned to a completed or cancelled booking"});
    }
    const driver = await Driver.findByPk(driverId, {transaction});
    if(!driver) {
      await transaction.rollback();
      return res.status(404).json({message: "Driver not found"});
    }
    if(driver.status !== "ACTIVE") {
      await transaction.rollback();
      return res.status(409).json({message: "Inactive driver cannot be assigned"});
    }
    /*
     * Allow existing assigned driver,
     * otherwise require AVAILABLE.
     */
    if(driver.id !== booking.driverId && driver.availability !== "AVAILABLE") {
      await transaction.rollback();
      return res.status(409).json({message: "Selected driver is not available"});
    }
    let vehicle = null;
    if(vehicleId) {
      vehicle = await Vehicle.findByPk(vehicleId, {transaction});
      if(!vehicle) {
        await transaction.rollback();
        return res.status(404).json({message: "Vehicle not found"});
      }
    }
    /*
     * If changing driver,
     * release previous driver.
     */
    if(booking.driverId && Number(booking.driverId) !== Number(driverId)) {
      await Driver.update({availability: "AVAILABLE"}, {where: {id: booking.driverId}, transaction});
    }
    await booking.update({driverId: driver.id, vehicleId: vehicle ? vehicle.id : null, status: "ASSIGNED"}, {transaction});
    await driver.update({availability: "BUSY"}, {transaction});
    await transaction.commit();
    notifyDriverAssigned(booking, driver).catch(console.error);
    return res.json({message: "Driver assigned successfully", booking});
  } catch(error) {
    await transaction.rollback();
    next(error);
  }
};

/*
 * ============================================================
 * POST /api/bookings/:id/status
 * ============================================================
 *
 * ACL:
 * bookings.status
 */
exports.status = async(req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const {status} = req.body;
    const validStatuses = ["PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED", "CANCELLED"];
    if(!validStatuses.includes(status)) {
      await transaction.rollback();
      return res.status(400).json({message: "Invalid booking status"});
    }
    const booking = await Booking.findByPk(req.params.id, {transaction});
    if(!booking) {
      await transaction.rollback();
      return res.status(404).json({message: "Booking not found"});
    }
    /*
     * Basic transition safety.
     */
    if(booking.status === "COMPLETED" && status !== "COMPLETED") {
      await transaction.rollback();
      return res.status(409).json({message: "Completed booking status cannot be changed"});
    }
    if(booking.status === "CANCELLED" && status !== "CANCELLED") {
      await transaction.rollback();
      return res.status(409).json({message: "Cancelled booking status cannot be changed"});
    }
    if(
      ["ASSIGNED", "ACCEPTED", "STARTED", "COMPLETED"].includes(status) && !booking.driverId) {
      await transaction.rollback();
      return res.status(409).json({message: "A driver must be assigned before setting this status"});
    }
    await booking.update({status}, {transaction});
    /*
     * Completed trip.
     */
    if(status === "COMPLETED") {
      if(booking.driverId) {
        await Driver.update({availability: "AVAILABLE"}, {where: {id: booking.driverId}, transaction});
      }
      /*
       * Avoid duplicate
       * earnings record.
       */
      const existingEarning = await DriverEarning.findOne({where: {bookingId: booking.id}, transaction});
      if(!existingEarning && booking.driverId) {
        await DriverEarning.create({
          driverId: booking.driverId,
          bookingId: booking.id,
          grossAmount: numberValue(booking.fare),
          commissionAmount: numberValue(booking.driverCommissionAmount),
          netAmount: numberValue(booking.driverNetEarning),
          status: "PENDING"
        }, {
          transaction
        });
      }
    }
    /*
     * Cancellation should release
     * assigned driver.
     */
    if(status === "CANCELLED" && booking.driverId) {
      await Driver.update({availability: "AVAILABLE"}, {where: {id: booking.driverId}, transaction});
    }
    await transaction.commit();
    notifyStatusChanged(booking).catch(console.error);
    return res.json({message: "Booking status updated successfully", booking});
  } catch(error) {
    await transaction.rollback();
    next(error);
  }
};

/*
 * ============================================================
 * POST /api/bookings/:id/cancel
 * ============================================================
 *
 * ACL:
 * bookings.cancel
 */
exports.cancel = async(req, res, next) => {
  const transaction = await sequelize.transaction();
  try {
    const booking = await Booking.findByPk(req.params.id, {transaction});
    if(!booking) {
      await transaction.rollback();
      return res.status(404).json({message: "Booking not found"});
    }
    if(booking.status === "COMPLETED") {
      await transaction.rollback();
      return res.status(409).json({message: "Completed booking cannot be cancelled"});
    }
    if(booking.status === "CANCELLED") {
      await transaction.rollback();
      return res.json({message: "Booking is already cancelled", booking});
    }
    await booking.update({status: "CANCELLED", cancelledAt: new Date(), remarks: req.body.reason ? `${booking.remarks || ""}\nCancellation: ${req.body.reason}`.trim() : booking.remarks}, {transaction});
    //await booking.update({status: "CANCELLED", cancellationReason: req.body.reason ? `${req.body.reason}`.trim() : "", cancelledAt: new Date()}, {transaction});
    if(booking.driverId) {
      await Driver.update({availability: "AVAILABLE"}, {where: {id: booking.driverId}, transaction});
    }
    await transaction.commit();
    notifyStatusChanged(booking).catch(console.error);
    return res.json({message: "Booking cancelled successfully", booking});
  } catch(error) {
    await transaction.rollback();
    next(error);
  }
};

/*
 * ============================================================
 * PUT /api/bookings/:id/commission
 * ============================================================
 *
 * ACL:
 * bookings.commission
 *
 * Intended for Super Admin / privileged admin.
 */
exports.updateBookingCommission = async(req, res, next) => {
  try {
    const {type, rate, includeAllowances = false} = req.body;
    if(!["PERCENTAGE", "FIXED"].includes(type)) {
      return res.status(400).json({message: "Commission type must be PERCENTAGE or FIXED"});
    }
    const numericRate = numberValue(rate);
    if(numericRate < 0) {
      return res.status(400).json({message: "Commission rate cannot be negative"});
    }
    if(type === "PERCENTAGE" && numericRate > 100) {
      return res.status(400).json({message: "Percentage commission cannot exceed 100"});
    }
    const booking = await Booking.findByPk(req.params.id);
    if(!booking) {
      return res.status(404).json({message: "Booking not found"});
    }
    if(["COMPLETED", "CANCELLED"].includes(booking.status)) {
      return res.status(409).json({message: "Commission cannot be changed after booking completion or cancellation"});
    }
    const commission = calculateCommission({
      fare: numberValue(booking.fare),
      baseFare: numberValue(booking.baseFare),
      driverAllowance: numberValue(booking.driverAllowance),
      nightAllowance: numberValue(booking.nightAllowance),
      type,
      rate: numericRate,
      includeAllowances
    });
    await booking.update({
      driverCommissionType: type,
      driverCommissionRate: numericRate,
      driverCommissionIncludeAllowances: Boolean(includeAllowances),
      driverCommissionAmount: commission.commissionAmount,
      driverNetEarning: commission.driverNetEarning
    });
    return res.json({message: "Driver commission updated successfully", booking});
  } catch(error) {
    next(error);
  }
};

exports.getAvailableDrivers = async (req, res, next) => {
  try {
      const { Driver } = require("../models");

      const drivers = await Driver.findAll({
          attributes: [
              "id",
              "name",
              "mobile",
              "availability"
          ]
      });

      const result = drivers.map(driver => {
          const data = driver.toJSON();

          return {
              ...data,
              availabilityClass: getDriverAvailabilityClass(data.availability)
          };
      });

      res.json({success: true, data: result});
  } catch (error) {
      next(error);
  }
};