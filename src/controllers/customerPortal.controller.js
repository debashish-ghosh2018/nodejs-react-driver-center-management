const { Op, fn, col } = require("sequelize");
const { sequelize, Customer, Booking, Payment, Driver, Vehicle, VehicleType } = require("../models");
const { httpError, parseId, getCustomer, validateBooking, pagination, bookingFilters, CUSTOMER_CANCELLABLE } = require("../services/booking.service");
const { validateVehicleType } = require("../services/vehicleType.service");


const ACTIVE_BOOKING_STATUSES = [
    "PENDING",
    "CONFIRMED",
    "ASSIGNED",
    "ACCEPTED"
];

const SUCCESSFUL_PAYMENT_STATUSES = [
    "SUCCESS",
    "COMPLETED",
    "PAID"
];

function generateBookingNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `BK-${year}${month}${day}-${random}`;
}


exports.dashboard = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Find Customer profile linked to authenticated user
        const customer = await Customer.findOne({
            where: { userId },
            attributes: [
                "id",
                "customerCode",
                "name",
                "email",
                "mobile",
                "status"
            ]
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer profile not found"
            });
        }

        const customerId = customer.id;

        // Count all bookings for this customer
        const totalBookings = await Booking.count({
            where: { customerId }
        });

        // Upcoming bookings based on booking date and active status
        const upcomingBookings = await Booking.count({
            where: {
                customerId,
                pickupDate: {
                    [Op.gte]: new Date()
                },
                status: {
                    [Op.in]: ACTIVE_BOOKING_STATUSES
                }
            }
        });

        // Completed bookings
        const completedBookings = await Booking.count({
            where: {
                customerId,
                status: "COMPLETED"
            }
        });

        // Total successful payments made for this customer's bookings
        const paymentResult = await Payment.findOne({
            attributes: [
                [
                    fn("COALESCE", fn("SUM", col("Payment.amount")), 0),
                    "totalSpent"
                ]
            ],
            include: [{
                model: Booking,
                as: "booking",
                attributes: [],
                required: true,
                where: { customerId }
            }],
            where: {
                paymentStatus: {
                    [Op.in]: SUCCESSFUL_PAYMENT_STATUSES
                }
            },
            raw: true
        });

        const totalSpent = Number(paymentResult?.totalSpent || 0);

        // Latest 5 bookings
        const recentBookings = await Booking.findAll({
            where: { customerId },
            attributes: [
                "id",
                "bookingNo",
                "pickupDate",
                "pickupLocation",
                "dropLocation",
                "tripCategory",
                "status",
                "fare",
                "driverId"
            ],
            include: [{
                model: Driver,
                as: "driver",
                attributes: [
                    "id",
                    "name",
                    "mobile"
                ],
                required: false
            }],
            order: [
                ["pickupDate", "DESC"]
            ],
            limit: 5
        });

        return res.status(200).json({
            success: true,
            message: "Customer dashboard loaded successfully",
            data: {
                customer: {
                    id: customer.id,
                    customerCode: customer.customerCode,
                    name: customer.name,
                    email: customer.email,
                    mobile: customer.mobile,
                    status: customer.status
                },
                totalBookings,
                upcomingBookings,
                completedBookings,
                totalSpent,
                recentBookings
            }
        });

    } catch (error) {
        next(error);
    }
};

// GET /api/customer/bookings
exports.listBookings = async (req, res, next) => {
    try {
        const customer = await getCustomer(req);
        const { page, limit, offset } = pagination(req.query);

        const where = {
            ...bookingFilters(req.query),
            customerId: customer.id
        };

        const { count, rows } = await Booking.findAndCountAll({
            where,
            include: [
                {
                    model: VehicleType,
                    as: "vehicleType",
                    attributes: [
                        "id",
                        "code",
                        "name",
                        "description",
                        "seatingCapacity",
                        "baseFare",
                        "perKmRate",
                    ],
                },                
                {
                    model: Driver,
                    as: "driver",
                    attributes: ["id", "name", "mobile"],
                    required: false
                }
            ],
            order: [["pickupDate", "DESC"]],
            limit,
            offset,
            distinct: true
        });

        res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit)
            }
        });
    } catch (error) {
        next(error);
    }
};

// GET /api/customer/bookings/:id
exports.getBooking = async (req, res, next) => {
    try {
        const customer = await getCustomer(req);

        const booking = await Booking.findOne({
            where: {
                id: parseId(req.params.id),
                customerId: customer.id
            },
            include: [
                {
                    model: Driver,
                    as: "driver",
                    attributes: ["id", "name", "mobile"],
                    required: false
                },
                {
                    model: Vehicle,
                    as: "vehicle",
                    required: false
                },
                {
                    model: VehicleType,
                    as: "vehicleType",
                    attributes: [
                        "id",
                        "code",
                        "name",
                        "description",
                        "seatingCapacity",
                        "baseFare",
                        "perKmRate",
                    ],
                }
            ]
        });

        if (!booking) {
            throw httpError(404, "Booking not found");
        }

        res.json({
            success: true,
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/customer/bookings
exports.createBooking = async (req, res, next) => {
    try {
        const customer = await getCustomer(req);

        if (customer.status !== "ACTIVE") {
            throw httpError(403, "Customer account is inactive");
        }

        const payload = validateBooking(req.body || {});
        const vehicleType = await validateVehicleType(req.body.vehicleTypeId, req.body.passengerCount);

        // Generate a collision-resistant booking reference.
        // Keep a UNIQUE database constraint on bookingCode.
        const { randomUUID } = require("crypto");

        const booking = await Booking.create({
            ...payload,
            bookingNo: generateBookingNo(),     //`BK-${randomUUID()}`,
            customerId: customer.id,
            driverId: null,
            vehicleId: null,
            vehicleTypeId: vehicleType.id,
            status: "PENDING",
            fare: 0
        });

        const createdBooking = await Booking.findByPk(booking.id, {
            include: [{
                model: VehicleType,
                as: "vehicleType",
                attributes: [
                    "id",
                    "code",
                    "name",
                    "seatingCapacity",
                    "baseFare",
                    "perKmRate",
                ]
            }]
        });
          

        res.status(201).json({
            success: true,
            message: "Booking created successfully",    //data: booking,
            data: createdBooking
        });
    } catch (error) {
        next(error);
    }
};

exports.updateBooking = async (req, res) => {
    try {
        const bookingId = Number(req.params.id);
  
        if (!Number.isSafeInteger(bookingId) || bookingId <= 0) {
            return res.status(400).json({success: false, message: "Invalid booking ID"});
        }
  
        const customer = await Customer.findOne({where: { userId: req.user.id }});
        if (!customer) {
            return res.status(404).json({success: false, message: "Customer profile not found"});
        }
  
        const result = await sequelize.transaction(async transaction => {
            const booking = await Booking.findOne({where: {id: bookingId, customerId: customer.id}, transaction, lock: transaction.LOCK.UPDATE});
            if (!booking) {
                const error = new Error("Booking not found");
                error.status = 404;
                throw error;
            }
  
            if (!["PENDING", "CONFIRMED"].includes(booking.status) || booking.driverId != null || booking.vehicleId != null) {
                const error = new Error("Booking cannot be modified after vehicle or driver assignment");
                error.status = 409;
                throw error;
            }
  
            const allowedFields = ["pickupAddress", "dropAddress", "notes"];
            const updates = {};
  
            for (const field of allowedFields) {
                if (Object.prototype.hasOwnProperty.call(req.body, field)) {
                    updates[field] = req.body[field];
                }
            }
  
            const passengerCount = req.body.passengerCount !== undefined ? req.body.passengerCount : booking.passengerCount;
              const vehicleTypeId = req.body.vehicleTypeId !== undefined ? req.body.vehicleTypeId : booking.vehicleTypeId;
  
            if (req.body.vehicleTypeId !== undefined || req.body.passengerCount !== undefined) {
                const vehicleType = await validateVehicleType(vehicleTypeId, passengerCount, transaction);
                updates.vehicleTypeId = vehicleType.id;
                updates.passengerCount = Number(passengerCount);
            }
  
            await booking.update(updates, { transaction });
  
            return booking.id;
        });
  
        const updatedBooking = await Booking.findByPk(result, {
            include: [{
                model: VehicleType,
                as: "vehicleType",
            }],
        });
  
        return res.json({
            success: true,
            message: "Booking updated successfully",
            data: updatedBooking,
        });
    } catch (error) {
        console.error("Booking update error:", error);
    
        return res.status(error.status || 500).json({
            success: false,
            message: error.status
            ? error.message
            : "Internal server error",
        });
    }
  };

// POST /api/customer/bookings/:id/cancel
exports.cancelBooking = async (req, res, next) => {
    try {
        const customer = await getCustomer(req);
        const id = parseId(req.params.id);

        const reason = String(
            req.body?.reason || ""
        ).trim();

        if (reason.length > 500) {
            throw httpError(400, "Cancellation reason too long");
        }

        const updated = await sequelize.transaction(
            async transaction => {
                const booking = await Booking.findOne({
                    where: {
                        id,
                        customerId: customer.id
                    },
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!booking) {
                    throw httpError(404, "Booking not found");
                }

                if (!CUSTOMER_CANCELLABLE.includes(
                    booking.status
                )) {
                    throw httpError(
                        409,
                        "Booking cannot be cancelled in its current state"
                    );
                }

                await booking.update({
                    status: "CANCELLED",
                    cancellationReason: reason,
                    cancelledAt: new Date()
                }, { transaction });

                return booking;
            }
        );

        res.json({
            success: true,
            message: "Booking cancelled successfully",
            data: updated
        });
    } catch (error) {
        next(error);
    }
};