const { Op } = require("sequelize");
const { VehicleType, Vehicle, Booking } = require("../models");

const editableFields = ["code", "name", "description", "seatingCapacity", "baseFare", "perKmRate", "status"];

function pickFields(body) {
    const result = {};
  
    for (const field of editableFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) { result[field] = body[field]; }
    }
  
    return result;
}
  
function sendError(res, error) {
    if (error.name === "SequelizeUniqueConstraintError") {
        return res.status(409).json({success: false, message: "Vehicle type code already exists"});
    }
  
    if (error.name === "SequelizeValidationError") {
        return res.status(400).json({success: false, message: error.errors.map(e => e.message).join(", ")});
    }
  
    console.error("Vehicle type error:", error);
  
    return res.status(500).json({success: false, message: "Internal server error"});
}
  
// CREATE
exports.create = async (req, res) => {
    try {
        const payload = pickFields(req.body);
        if (!payload.code || !payload.name || payload.seatingCapacity == null) {
            return res.status(400).json({success: false, message: "Code, name and seating capacity are required"});
        }
  
        payload.code = String(payload.code).trim().toUpperCase();
        payload.name = String(payload.name).trim();
  
        const vehicleType = await VehicleType.create(payload);
  
        return res.status(201).json({
            success: true,
            message: "Vehicle type created successfully",
            data: vehicleType,
        });
    } catch (error) {
        return sendError(res, error);
    }
};
  
// LIST
exports.list = async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 10));
  
        const where = {};
        where.isDeleted = 0;

        if (req.query.search) {
            const search = String(req.query.search).trim();
            where[Op.or] = [
                { code: { [Op.like]: `%${search}%` } },
                { name: { [Op.like]: `%${search}%` } },
                { seatingCapacity: { [Op.like]: `%${search}%` } },
                { baseFare: { [Op.like]: `%${search}%` } },
                { perKmRate: { [Op.like]: `%${search}%` } },
            ];
        }
  
        if (req.query.status !== undefined) {
            if (!["ACTIVE", "INACTIVE"].includes(req.query.status)) {
                return res.status(400).json({success: false, message: "status must be ACTIVE or INACTIVE"});
            }
            where.status = req.query.status;
        }
  
        const { rows, count } = await VehicleType.findAndCountAll({where, order: [["name", "ASC"]], limit, offset: (page - 1) * limit});
        return res.json({
            success: true,
            data: rows,
            pagination: {
                page,
                limit,
                total: count,
                totalPages: Math.ceil(count / limit),
            },
        });
    } catch (error) {
        return sendError(res, error);
    }
};
  
// VIEW
exports.view = async (req, res) => {
    try {
        const vehicleType = await VehicleType.findByPk(req.params.id);
  
        if (!vehicleType) {
            return res.status(404).json({success: false, message: "Vehicle type not found"});
        }
  
        return res.json({
            success: true,
            data: vehicleType,
         });
    } catch (error) {
        return sendError(res, error);
    }
};
  
// UPDATE
exports.update = async (req, res) => {
    try {
        const vehicleType = await VehicleType.findByPk(req.params.id);
        if (!vehicleType) {
            return res.status(404).json({success: false, message: "Vehicle type not found"});
        }
  
        const payload = pickFields(req.body);
        if (payload.code !== undefined) {
            payload.code = String(payload.code).trim().toUpperCase();
        }
  
        if (payload.name !== undefined) {
            payload.name = String(payload.name).trim();
        }
  
        const vehicleTypeDetails = `${payload.name} - ${payload.code} [Capacity: ${payload.seatingCapacity}, Base Fare: ${parseFloat(payload.baseFare)}, Rate Per KM: ${parseFloat(payload.perKmRate)}]`;
        await Vehicle.update(
            { vehicleType: vehicleTypeDetails }, 
            { where: { vehicleTypeId: req.params.id } } // [101, 102, 103] => Automatically builds "WHERE id IN (101, 102, 103)"
        );
        
        await vehicleType.update(payload);
        return res.json({
            success: true,
            message: "Vehicle type updated successfully",
            data: vehicleType,
        });
    } catch (error) {
        return sendError(res, error);
    }
};
  
// DELETE / DEACTIVATE
exports.remove = async (req, res) => {
    try {
        const vehicleType = await VehicleType.findByPk(req.params.id);
        if (!vehicleType) {
            return res.status(404).json({success: false, message: "Vehicle type not found"});
        }
  
        const bookingCount = await Booking.count({where: { vehicleTypeId: vehicleType.id }});
        if (bookingCount > 0) {
            await vehicleType.update({ status: "INACTIVE" });
            return res.json({success: true, message: "Vehicle type is used in bookings and has been deactivated"});
        }
  
        // Prefer deactivation even if no booking exists.
        // This also avoids breaking other vehicle references.
        await vehicleType.update({ isDeleted: 1 });
  
        return res.json({success: true, message: "Vehicle type deactivated successfully"});
    } catch (error) {
      return sendError(res, error);
    }
};
  
// ACTIVE TYPES FOR BOOKING FORM
exports.activeList = async (req, res) => {
    try {
        const vehicleTypes = await VehicleType.findAll({
            where: { status: "ACTIVE", isDeleted: 0 },
            attributes: [
                "id",
                "code",
                "name",
                "description",
                "seatingCapacity",
                "baseFare",
                "perKmRate",
            ],
            order: [["name", "ASC"]],
        });
  
        return res.json({success: true, data: vehicleTypes});
    } catch (error) {
        return sendError(res, error);
    }
};