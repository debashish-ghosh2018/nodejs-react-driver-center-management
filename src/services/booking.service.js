const { Op } = require("sequelize");
const { Customer, Driver } = require("../models");

const CUSTOMER_CANCELLABLE = [
    "PENDING", "CONFIRMED", "ASSIGNED", "ACCEPTED"
];

const DRIVER_VISIBLE = [
    "ASSIGNED", "ACCEPTED", "STARTED",
    "COMPLETED", "CANCELLED"
];

const BOOKING_STATUSES = [
    "PENDING", "CONFIRMED", "ASSIGNED",
    "ACCEPTED", "STARTED", "COMPLETED",
    "CANCELLED"
];

function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

function parseId(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0) {
        throw httpError(400, "Invalid booking ID");
    }
    return id;
}

async function getCustomer(req) {
    const customer = await Customer.findOne({
        where: { userId: req.user.id }
    });

    if (!customer) {
        throw httpError(404, "Customer profile not found");
    }

    return customer;
}

async function getDriver(req) {
    const driver = await Driver.findOne({
        where: { userId: req.user.id }
    });

    if (!driver) {
        throw httpError(404, "Driver profile not found");
    }

    return driver;
}

function validateBooking(body) {
    const pickupLocation = String(body.pickupLocation || "").trim();
    const dropLocation = String(body.dropLocation || "").trim();
    const pickupDate = String(body.pickupDate || "");
    const pickupTime = String(body.pickupTime || "");

    if (!pickupLocation || !dropLocation) {
        throw httpError(400, "Pickup and destination addresses are required");
    }

    if (pickupLocation.length > 1000 || dropLocation.length > 1000) {
        throw httpError(400, "Address is too long");
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(pickupDate) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(pickupTime)) {
        throw httpError(400, "Invalid booking date or time");
    }

    // This example expects the client to provide a local
    // date/time in the configured business time zone.
    // Adapt conversion to your application's timezone.
    const scheduledAt = new Date(`${pickupDate}T${pickupTime}:00+05:30`);
    if (Number.isNaN(scheduledAt.getTime()) ||  scheduledAt <= new Date()) {
        throw httpError(400, "Booking must be in the future");
    }

    const passengerCount = Number(body.passengerCount ?? 1);
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 7) {
        throw httpError(400, "Invalid passenger count");
    }

    const isOutstation = body.isOutstation === true;
    const returnTrip = isOutstation && body.returnTrip === true;

    let returnDate = null;
    let returnTime = null;

    if (returnTrip) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(String(body.returnDate || ""))) {
            throw httpError(400, "Valid return date required");
        }

        const parsedReturn = new Date(`${body.returnDate}T23:59:59+05:30`);
        if (Number.isNaN(parsedReturn.getTime()) || parsedReturn < scheduledAt) {
            throw httpError(400, "Invalid return date");
        }

        returnDate = body.returnDate;
        returnTime = body.returnTime || "23:59";
    }

    const notes = String(body.remarks || "").trim();

    if (notes.length > 2000) {
        throw httpError(400, "Notes are too long");
    }

    return {
        pickupLocation,
        dropLocation,
        pickupDate,
        pickupTime,
        tripCategory: body.tripCategory,
        bookingType: body.bookingType,
        returnDate,
        returnTime,
        remarks: notes
    };
}

function pagination(query) {
    const page = Number(query.page || 1);
    const limit = Number(query.limit || 10);

    if (!Number.isInteger(page) || page < 1 ||
        !Number.isInteger(limit) ||
        limit < 1 || limit > 100) {
        throw httpError(400, "Invalid pagination parameters");
    }

    return {
        page,
        limit,
        offset: (page - 1) * limit
    };
}

function bookingFilters(query) {
    const where = {};

    if (query.status) {
        const status = String(query.status).toUpperCase();

        if (!BOOKING_STATUSES.includes(status)) {
            throw httpError(400, "Invalid booking status");
        }

        where.status = status;
    }

    if (query.type) {
        const type = String(query.type).toUpperCase();

        if (!["LOCAL", "OUTSTATION"].includes(type)) {
            throw httpError(400, "Invalid booking type");
        }

        where.tripCategory = type;  // === "OUTSTATION"
    }

    if (query.search) {
        const search = String(query.search).trim();

        if (search.length > 100) {
            throw httpError(400, "Search term is too long");
        }

        where.bookingNo = {
            [Op.like]: `%${search}%`
        };
    }

    return where;
}

module.exports = {
    httpError,
    parseId,
    getCustomer,
    getDriver,
    validateBooking,
    pagination,
    bookingFilters,
    CUSTOMER_CANCELLABLE,
    DRIVER_VISIBLE
};