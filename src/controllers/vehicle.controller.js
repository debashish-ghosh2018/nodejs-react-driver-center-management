const { Vehicle } = require("../models");
const { createCrud } = require("./crud.controller");

const crud = createCrud(Vehicle, {
	"searchFields": ["vehicleNo", "vehicleType", "brand", "model", "year"], 
	"filterFields": {
		"status": {field: "status", type: "enum", values: ["ACTIVE", "INACTIVE"]}
	}
});
exports.list = crud.list;
exports.get = crud.get;
exports.create = crud.create;
exports.update = crud.update;
exports.remove = crud.remove;
exports.disable = crud.disable;
