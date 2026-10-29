const VehicleType = require("../models/VehicleType");
const Vehicle = require("../models/Vehicle");


function httpError(status, message) {
    const error = new Error(message);
    error.status = status;
    return error;
}

async function validateVehicleType(vehicleTypeId, passengerCount, transaction = undefined) {
    const id = Number(vehicleTypeId);

    if (!Number.isSafeInteger(id) || id <= 0) {
        const error = new Error("Valid vehicle type is required");
        error.status = 400;
        throw error;
    }

    const vehicleType = await VehicleType.findOne({where: { id, isActive: true }, transaction});
    if (!vehicleType) {
        const error = new Error("Vehicle type not found or inactive");
        error.status = 400;
        throw error;
    }

    const passengers = Number(passengerCount);
    if (!Number.isSafeInteger(passengers) || passengers < 1) {
        const error = new Error("Passenger count must be a positive integer");
        error.status = 400;
        throw error;
    }

    if (passengers > vehicleType.seatingCapacity) {
        const error = new Error(`Maximum seating capacity for ${vehicleType.name} is ` + vehicleType.seatingCapacity);
        error.status = 400;
        throw error;
    }

    return vehicleType;
}

async function validateBookingVehicleType(vehicleTypeId, passengerCount, vehicleId, transaction = undefined) {
    const typeId = Number(vehicleTypeId);
    const passengers = Number(passengerCount);

    if (!Number.isSafeInteger(typeId) || typeId <= 0) {
        throw httpError(400, "Valid vehicle type is required");
    }

    if (!Number.isSafeInteger(passengers) || passengers < 1) {
        throw httpError(400, "Invalid passenger count");
    }

    const vehicleType = await VehicleType.findByPk(typeId, {transaction});
    if (!vehicleType || !vehicleType.isActive) {
        throw httpError(400, "Vehicle type is inactive or not found");
    }

    if (passengers > vehicleType.seatingCapacity) {
        throw httpError(400, `Maximum passenger capacity for ${vehicleType.name} is ${vehicleType.seatingCapacity}`);
    }

    let vehicle = null;
    if (vehicleId !== null && vehicleId !== undefined) {
        const id = Number(vehicleId);

        if (!Number.isSafeInteger(id) || id <= 0) {
            throw httpError(400, "Invalid vehicle ID");
        }

        vehicle = await Vehicle.findByPk(id, { transaction });
        if (!vehicle) {
            throw httpError(404, "Assigned vehicle not found");
        }

        if (Number(vehicle.vehicleTypeId) !== typeId) {
            throw httpError(400, "Assigned vehicle does not match selected vehicle type");
        }

        // Add existing vehicle active/availability checks here.
    }

    return { vehicleType, vehicle };
}

module.exports = { validateBookingVehicleType, httpError, validateVehicleType };