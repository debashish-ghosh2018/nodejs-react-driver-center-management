const {Driver, User, DriverLocation, Booking, Vehicle} = require("../models");
const {Op} = require("sequelize");
//const { createCrud } = require("./crud.controller");

//const crud = createCrud(Driver);

//exports.list = crud.list;
//exports.get = crud.get;
//exports.create = async (req, res, next) => {
//  req.body.driverCode ||= `DRV-${Date.now()}`;
//  crud.create(req, res, next);
//};
//exports.update = crud.update;
//exports.remove = crud.remove;
//exports.disable = crud.disable;

/*
exports.availability = async (req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if (!driver) return res.status(404).json({ message: "Driver not found" });
    const allowed = ["AVAILABLE", "BUSY", "OFFLINE"];
    if (!allowed.includes(req.body.availability)) return res.status(400).json({ message: "Invalid availability" });
    driver.availability = req.body.availability;
    await driver.save();
    res.json(driver);
  } catch (e) { next(e); }
};
*/

/**
 * ============================================================
 * GET /api/drivers
 * ============================================================
 *
 * ACL:
 * drivers.view
 *
 * Supports:
 * ?search=
 * ?status=ACTIVE
 * ?availability=AVAILABLE
 * ?page=1
 * ?limit=20
 */
exports.list = async(req, res, next) => {
  try {
    const {search = "", status = "", availability = "", page = 1, limit = 20} = req.query;
    const where = {"isDeleted": 0};
    if(status) {
      where.status = status;
    }
    if(availability) {
      where.availability = availability;
    }
    if(search) {
      where[Op.or] = [
        {name: {[Op.like]: `%${search}%`}},
        {mobile: {[Op.like]: `%${search}%`}}, 
        {email: {[Op.like]: `%${search}%`}}, 
        {driverCode: {[Op.like]: `%${search}%`}}, 
        {licenseNo: {[Op.like]: `%${search}%`}}
      ];
    }
    const currentPage = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
    const offset = (currentPage - 1) * pageSize;
    const {count,rows} = await Driver.findAndCountAll({
      where, 
      include: [{model: User, as: "user", required: false, attributes: ["id", "name", "email", "role", "status"]}],
      order: [["id", "DESC"]],
      limit: pageSize,
      offset
    });

    return res.json({
      data: rows,
      pagination: {
        page: currentPage,
        limit: pageSize,
        total: count,
        totalPages: Math.ceil(count / pageSize)
      }
    });
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * GET /api/drivers/:id
 * ============================================================
 *
 * ACL:
 * drivers.view
 */
exports.get = async(req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {
      include: [{
        model: User,
        as: "user",
        required: false,
        attributes: ["id", "name", "email", "role", "status"]
      }, {
        model: DriverLocation,
        as: "locations",
        required: false,
        separate: true,
        limit: 1,
        order: [
          ["recordedAt", "DESC"]
        ]
      }]
    });
    if(!driver) {
      return res.status(404).json({
        message: "Driver not found"
      });
    }
  
    return res.json(driver);
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * POST /api/drivers
 * ============================================================
 *
 * ACL:
 * drivers.create
 *
 * Creates only Driver profile.
 * Does NOT create login User.
 */
exports.create = async(req, res, next) => {
  try {
    const {name, mobile, email, licenseNo, licenseExpiry, experienceYears, address, city, state, pincode, availability = "AVAILABLE", status = "ACTIVE"} = req.body;
    
    if(!name || !mobile) {
      return res.status(400).json({message: "Name and mobile are required"});
    }

    const duplicateMobile = await Driver.findOne({where: {mobile}});
    if(duplicateMobile) {
      return res.status(409).json({message: "Driver already exists with this mobile number"});
    }

    if(licenseNo) {
      const duplicateLicense = await Driver.findOne({where: {licenseNo}});
      if(duplicateLicense) {
        return res.status(409).json({message: "Driver already exists with this license number"});
      }
    }

    const driver = await Driver.create({
      driverCode: `DRV-${Date.now()}`,
      name,
      mobile,
      email: email || null,
      licenseNo: licenseNo || null,
      licenseExpiry: licenseExpiry || null,
      experienceYears: experienceYears || 0,
      address: address || null,
      city: city || null,
      state: state || null,
      pincode: pincode || null,
      availability,
      status,
      userId: null
    });

    return res.status(201).json({message: "Driver created successfully", driver});
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * PUT /api/drivers/:id
 * ============================================================
 *
 * ACL:
 * drivers.update
 */
exports.update = async(req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if(!driver) {
      return res.status(404).json({message: "Driver not found"});
    }

    const allowedFields = ["name", "mobile", "email", "licenseNo", "licenseExpiry", "experienceYears", "address", "city", "state", "pincode", "availability", "status"];
    const updateData = {};
    allowedFields.forEach(field => {
      if(Object.prototype.hasOwnProperty.call(req.body, field)) {
        updateData[field] = req.body[field];
      }
    });

    if(updateData.mobile && updateData.mobile !== driver.mobile) {
      const existing = await Driver.findOne({where: {mobile: updateData.mobile, id: {[Op.ne]: driver.id}}});
      if(existing) {
        return res.status(409).json({message: "Another driver already uses this mobile number"});
      }
    }
    if(updateData.licenseNo && updateData.licenseNo !== driver.licenseNo) {
      const existing = await Driver.findOne({where: {licenseNo: updateData.licenseNo, id: {[Op.ne]: driver.id}}});
      if(existing) {
        return res.status(409).json({message: "Another driver already uses this license number"});
      }
    }
    await driver.update(updateData);

    return res.json({message: "Driver updated successfully", driver});
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * DELETE /api/drivers/:id
 * ============================================================
 *
 * ACL:
 * drivers.delete
 *
 * Recommended behavior:
 * Prevent deletion when bookings exist.
 */
exports.remove = async(req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if(!driver) {
      return res.status(404).json({message: "Driver not found"});
    }

    const bookingCount = await Booking.count({where: {driverId: driver.id}});
    if(bookingCount > 0) {
      return res.status(409).json({message: "Driver cannot be deleted because bookings are associated with this driver. Deactivate the driver instead."});
    }

    if(driver.userId) {
      await User.update({status: "INACTIVE"}, {where: {id: driver.userId}});
    }
    await driver.destroy();

    return res.json({message: "Driver deleted successfully"});
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * DELETE /api/drivers/:id
 * ============================================================
 *
 * ACL:
 * drivers.delete
 */
exports.disable = async(req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id);
    if(!driver) {
      return res.status(404).json({message: "Driver not found"});
    }

    const updateData = {"isDeleted": 1};
    await driver.update(updateData);

    return res.json({message: "Driver deleted successfully"});
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * PUT /api/drivers/:id/availability
 * ============================================================
 *
 * ACL:
 * drivers.availability
 *
 * Admin usage.
 */

/*
exports.availability = async (req, res, next) => {
  try {
    let driverId = Number(req.params.id);

    if (req.user.role === "DRIVER") {
      driverId = req.user.driverId;
    }

    const driver = await Driver.findByPk(driverId);
    if (!driver) {
      return res.status(404).json({message: "Driver not found"});
    }

    const allowed = ["AVAILABLE","BUSY","OFFLINE"];
    if (!allowed.includes(req.body.availability)) {
      return res.status(400).json({ message: "Invalid availability" });
    }

    await driver.update({ availability: req.body.availability });
    res.json(driver);
  } catch (error) {
    next(error);
  }
};
*/

exports.availability = async(req, res, next) => {
  try {
    const {availability} = req.body;
    const allowed = ["AVAILABLE", "BUSY", "OFFLINE", "ON_LEAVE"];

    if(!allowed.includes(availability)) {
      return res.status(400).json({ message: "Invalid driver availability"});
    }

    const driver = await Driver.findByPk(req.params.id);
    if(!driver) {
      return res.status(404).json({message: "Driver not found"});
    }
    await driver.update({availability});

    return res.json({message: "Driver availability updated", driver});
  } catch(error) {
    next(error);
  }
};

/**
 * ============================================================
 * GET /api/drivers/:id/location
 * ============================================================
 *
 * ACL:
 * drivers.location
 */
exports.location = async(req, res, next) => {
  try {
    const driver = await Driver.findByPk(req.params.id, {attributes: ["id", "driverCode", "name", "mobile", "availability"]});

    if(!driver) {
      return res.status(404).json({message: "Driver not found"});
    }
    const location = await DriverLocation.findOne({where: {driverId: driver.id}, order: [["recordedAt", "DESC"]]});

    return res.json({driver, location: location || null});
  } catch(error) {
    next(error);
  }
};
