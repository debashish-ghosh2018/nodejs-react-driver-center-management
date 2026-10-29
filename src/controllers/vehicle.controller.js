const { sequelize, VehicleType, Vehicle } = require("../models");
const { createCrud } = require("./crud.controller");

const crud = createCrud(Vehicle, {
	"searchFields": ["vehicleNo", "vehicleType", "brand", "model", "year"], 
	"filterFields": {
		"status": {field: "status", type: "enum", values: ["ACTIVE", "INACTIVE"]}
	}
});
exports.list = crud.list;
exports.get = crud.get;
exports.remove = crud.remove;
exports.disable = crud.disable;

//exports.create = crud.create;
//exports.update = crud.update;

exports.create = async(req, res, next) => {
	const transaction = await sequelize.transaction();
	try {
		const {
			vehicleNo,
			brand,
			model,
			year,
			insuranceExpiry,
			fitnessExpiry,
			status,
			vehicleTypeId
		} = req.body;
	
		if(!vehicleNo || !year || !insuranceExpiry || !fitnessExpiry || !vehicleTypeId) {
			await transaction.rollback();
			return res.status(400).json({message: "Vehicle Number, Year, Insurance Expiry Date, Fitness Expiry Date and Vehicle Type are required"});
		}
	
		const vehicleTypeData = await VehicleType.findByPk(vehicleTypeId, {transaction});
		if(!vehicleTypeData) {
			await transaction.rollback();
			return res.status(404).json({message: "Vehicle Type not found"});
		}
		if (vehicleTypeData.status !== "ACTIVE") {
			throw httpError(400, "Inactive vehicle type cannot be assigned to a vehicle");
		}
		
		const vehicleData = {
			vehicleNo,
			brand: brand || null,
			model: model || null,
			year,
			insuranceExpiry,
			fitnessExpiry,
			vehicleTypeId,
			status: status || "ACTIVE"
		};

		const vehicleType = `${vehicleTypeData.name} - ${vehicleTypeData.code} [Capacity: ${vehicleTypeData.seatingCapacity}, Base Fare: ${parseFloat(vehicleTypeData.baseFare)}, Rate Per KM: ${parseFloat(vehicleTypeData.perKmRate)}]`;
		vehicleData.vehicleType = vehicleType;

		const vehicle = await Vehicle.create(vehicleData, {transaction});
		await transaction.commit();

		return res.status(201).json({message: "Vehicle created successfully", vehicle});
	} catch(error) {
		await transaction.rollback();
		next(error);
	}
};
  
exports.update = async(req, res, next) => {
	const transaction = await sequelize.transaction();
	try {
		const vehicle = await Vehicle.findByPk(req.params.id);
		if(!vehicle) {
			return res.status(404).json({message: "Vehicle not found"});
		}

		const allowedFields = ["vehicleNo", "brand", "model", "year", "insuranceExpiry", "fitnessExpiry", "vehicleTypeId", "status"];
		const updateData = {};
		allowedFields.forEach(field => {
			if(Object.prototype.hasOwnProperty.call(req.body, field)) {
			updateData[field] = req.body[field];
			}
		});

		const vehicleTypeData = await VehicleType.findByPk(updateData.vehicleTypeId, {transaction});
		if(!vehicleTypeData) {
			await transaction.rollback();
			return res.status(404).json({message: "Vehicle Type not found"});
		}
		if (vehicleTypeData.status !== "ACTIVE") {
			await transaction.rollback();
			throw httpError(400, "Inactive vehicle type cannot be assigned to a vehicle");
		}	
		const vehicleType = `${vehicleTypeData.name} - ${vehicleTypeData.code} [Capacity: ${vehicleTypeData.seatingCapacity}, Base Fare: ${parseFloat(vehicleTypeData.baseFare)}, Rate Per KM: ${parseFloat(vehicleTypeData.perKmRate)}]`;
		updateData.vehicleType = vehicleType;  

		await vehicle.update(updateData, {transaction});
		await transaction.commit();

		return res.json({message: "Vehicle updated successfully", vehicle});
	} catch(error) {
		await transaction.rollback();
	  	next(error);
	}
};


