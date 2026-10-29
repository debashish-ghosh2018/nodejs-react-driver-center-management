const { Op, fn, col } = require("sequelize");
const { sequelize, Driver, Booking, Customer } = require("../models");
const { httpError, parseId, getDriver, pagination, bookingFilters } = require("../services/booking.service");

const CURRENT_BOOKING_STATUSES = [
    "ASSIGNED",
    "ACCEPTED",
    "STARTED"
];

// Example only: replace with stored trip settlement data
const DEFAULT_COMMISSION_RATE = 10;

function getTodayRange() {
    const now = new Date();

    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    return { start, end };
}

exports.dashboard = async (req, res, next) => {
    try {
        const userId = req.user.id;

        const driver = await Driver.findOne({
            where: { userId },
            attributes: [
                "id",
                "name",
                "mobile",
                "status",
                "availability"
            ]
        });

        if (!driver) {
            return res.status(404).json({
                success: false,
                message: "Driver profile not found"
            });
        }

        const driverId = driver.id;
        const { start, end } = getTodayRange();

        // Trips scheduled for today
        const todayTrips = await Booking.count({
            where: {
                driverId,
                bookingDate: {
                    [Op.gte]: start,
                    [Op.lt]: end
                }
            }
        });

        // Completed trips
        const completedTrips = await Booking.count({
            where: {
                driverId,
                status: "COMPLETED"
            }
        });

        // Gross fare of all completed trips
        const totalGrossFare = Number(
            await Booking.sum("totalFare", {
                where: {
                    driverId,
                    status: "COMPLETED"
                }
            }) || 0
        );

        // Gross fare for trips scheduled today and completed
        const todayGrossFare = Number(
            await Booking.sum("totalFare", {
                where: {
                    driverId,
                    status: "COMPLETED",
                    bookingDate: {
                        [Op.gte]: start,
                        [Op.lt]: end
                    }
                }
            }) || 0
        );

        // Illustrative commission calculation
        const commissionRate = DEFAULT_COMMISSION_RATE;

        const totalCommission =
            totalGrossFare * commissionRate / 100;

        const todayCommission =
            todayGrossFare * commissionRate / 100;

        const totalEarnings =
            totalGrossFare - totalCommission;

        const todayEarnings =
            todayGrossFare - todayCommission;

        // Active assigned bookings
        const bookings = await Booking.findAll({
            where: {
                driverId,
                status: {
                    [Op.in]: CURRENT_BOOKING_STATUSES
                }
            },
            attributes: [
                "id",
                "bookingCode",
                "bookingDate",
                "pickupAddress",
                "destinationAddress",
                "isOutstation",
                "status",
                "totalFare"
            ],
            include: [{
                model: Customer,
                as: "customer",
                attributes: [
                    "id",
                    "name",
                    "mobile"
                ],
                required: false
            }],
            order: [
                ["bookingDate", "ASC"]
            ],
            limit: 10
        });

        return res.status(200).json({
            success: true,
            message: "Driver dashboard loaded successfully",
            data: {
                driver: {
                    id: driver.id,
                    name: driver.name,
                    mobile: driver.mobile,
                    status: driver.status
                },
                availability: driver.availability || "OFFLINE",
                todayTrips,
                completedTrips,
                todayEarnings,
                totalEarnings,
                bookings,
                earningsSummary: {
                    commissionRate,
                    totalGrossFare,
                    totalCommission,
                    totalEarnings,
                    todayGrossFare,
                    todayCommission,
                    todayEarnings
                }
            }
        });

    } catch (error) {
        next(error);
    }
};

// GET /api/driver/bookings
exports.listBookings = async (req, res, next) => {
    try {
        const driver = await getDriver(req);
        const { page, limit, offset } = pagination(req.query);

        const where = {
            ...bookingFilters(req.query),
            driverId: driver.id
        };

        const { count, rows } = await Booking.findAndCountAll({
            where,
            include: [{
                model: Customer,
                as: "customer",
                attributes: ["id", "name", "mobile"],
                required: false
            }],
            order: [["bookingDate", "DESC"]],
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

// GET /api/driver/bookings/:id
exports.getBooking = async (req, res, next) => {
    try {
        const driver = await getDriver(req);

        const booking = await Booking.findOne({
            where: {
                id: parseId(req.params.id),
                driverId: driver.id
            },
            include: [{
                model: Customer,
                as: "customer",
                attributes: ["id", "name", "mobile"],
                required: false
            }]
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

// Reusable atomic status transition
async function changeStatus(req, config) {
    const driver = await getDriver(req);
    const id = parseId(req.params.id);

    if (driver.status !== "ACTIVE") {
        throw httpError(403, "Driver account is inactive");
    }

    return sequelize.transaction(async transaction => {
        const booking = await Booking.findOne({
            where: {
                id,
                driverId: driver.id
            },
            transaction,
            lock: transaction.LOCK.UPDATE
        });

        if (!booking) {
            throw httpError(404, "Booking not found");
        }

        if (booking.status !== config.from) {
            throw httpError(
                409,
                `Booking must be ${config.from} to perform this action`
            );
        }

        const changes = {
            status: config.to,
            ...config.changes
        };

        await booking.update(changes, { transaction });

        return booking;
    });
}

// POST /api/driver/bookings/:id/accept
exports.acceptBooking = async (req, res, next) => {
    try {
        const booking = await changeStatus(req, {
            from: "ASSIGNED",
            to: "ACCEPTED",
            changes: {
                acceptedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: "Booking accepted successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/bookings/:id/reject
exports.rejectBooking = async (req, res, next) => {
    try {
        const reason = String(
            req.body?.reason || ""
        ).trim();

        if (!reason || reason.length > 500) {
            throw httpError(
                400,
                "A rejection reason of up to 500 characters is required"
            );
        }

        const booking = await changeStatus(req, {
            from: "ASSIGNED",
            to: "PENDING",
            changes: {
                driverId: null,
                rejectionReason: reason,
                rejectedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: "Booking rejected and returned for reassignment",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/bookings/:id/start
exports.startBooking = async (req, res, next) => {
    try {
        const booking = await changeStatus(req, {
            from: "ACCEPTED",
            to: "STARTED",
            changes: {
                startedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: "Trip started successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/driver/bookings/:id/complete
exports.completeBooking = async (req, res, next) => {
    try {
        const distance = Number(
            req.body?.actualDistance
        );

        if (!Number.isFinite(distance) ||
            distance <= 0 || distance > 100000) {
            throw httpError(
                400,
                "Valid actualDistance in KM is required"
            );
        }

        const booking = await changeStatus(req, {
            from: "STARTED",
            to: "COMPLETED",
            changes: {
                actualDistance: distance,
                completedAt: new Date()
            }
        });

        res.json({
            success: true,
            message: "Trip completed successfully",
            data: booking
        });
    } catch (error) {
        next(error);
    }
};