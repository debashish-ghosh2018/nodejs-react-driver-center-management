const {Customer, User, Booking} = require("../models");
const {Op} = require("sequelize");
//const { createCrud } = require("./crud.controller");

//const crud = createCrud(Customer);

//exports.list = crud.list;
//exports.get = crud.get;
//exports.create = async (req, res, next) => {
//  req.body.customerCode ||= `CUS-${Date.now()}`;
//  crud.create(req, res, next);
//};
//exports.update = crud.update;
//exports.remove = crud.remove;
//exports.disable = crud.disable;

/*
|--------------------------------------------------------------------------
| Helpers
|--------------------------------------------------------------------------
*/
function normalizeText(value) {
  if(value === undefined || value === null) {
    return null;
  }
  const text = String(value).trim();
  return text || null;
}

function normalizeEmail(value) {
  const email = normalizeText(value);
  return email ? email.toLowerCase() : null;
}

function normalizeMobile(value) {
  const mobile = normalizeText(value);
  return mobile ? mobile.replace(/\s+/g, "") : null;
}

function generateCustomerCode() {
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(100 + Math.random() * 900);
  return `CUS-${timestamp}-${random}`;
}

function isValidStatus(status) {
  return ["ACTIVE", "INACTIVE"].includes(status);
}

/*
|--------------------------------------------------------------------------
| GET /api/customers
|--------------------------------------------------------------------------
|
| Query Parameters:
|
| search
| status
| linked
| page
| limit
| sortBy
| sortOrder
|
*/
exports.list = async(req, res, next) => {
  try {
    const {search, status, linked, page = 1, limit = 20, sortBy = "createdAt", sortOrder = "DESC"} = req.query;
    const currentPage = Math.max(Number(page) || 1, 1);
    const pageLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
    const where = {};
    /*
    |--------------------------------------------------------------------------
    | Search
    |--------------------------------------------------------------------------
    */
    if(search && String(search).trim()) {
      const keyword = `%${String(search).trim()}%`;
      where[Op.or] = [
        {customerCode: {[Op.like]: keyword}}, 
        {name: {[Op.like]: keyword}}, 
        {mobile: {[Op.like]: keyword}}, 
        {email: {[Op.like]: keyword}}
      ];
    }
    /*
    |--------------------------------------------------------------------------
    | Status Filter
    |--------------------------------------------------------------------------
    */
    if(status && isValidStatus(status)) {
      where.status = status;
    }
    /*
    |--------------------------------------------------------------------------
    | Login linkage filter
    |--------------------------------------------------------------------------
    |
    | linked=true
    | linked=false
    |
    */
    if(linked === "true") {
      where.userId = {[Op.ne]: null};
    }
    if(linked === "false") {
      where.userId = {[Op.is]: null};
    }
    /*
    |--------------------------------------------------------------------------
    | Sorting whitelist
    |--------------------------------------------------------------------------
    */
    const allowedSortFields = ["id", "customerCode", "name", "mobile", "email", "status", "createdAt", "updatedAt"];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    const safeSortOrder = String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";
    const result = await Customer.findAndCountAll({
      where,
      include: [{model: User, as: "user", attributes: ["id", "name", "email", "role", "status"], required: false}],
      order: [[safeSortBy, safeSortOrder]],
      limit: pageLimit,
      offset: (currentPage - 1) * pageLimit,
      distinct: true
    });
    return res.json({data: result.rows, pagination: {page: currentPage, limit: pageLimit, total: result.count, totalPages: Math.ceil(result.count / pageLimit)}});
  } catch(error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| GET /api/customers/:id
|--------------------------------------------------------------------------
*/
exports.get = async(req, res, next) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) {
      return res.status(400).json({message: "Invalid customer ID."});
    }
    const customer = await Customer.findByPk(id, {include: [{model: User, as: "user", attributes: ["id", "name", "email", "role", "status"]}]});
    if(!customer) {
      return res.status(404).json({message: "Customer not found."});
    }
    return res.json(customer);
  } catch(error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| POST /api/customers
|--------------------------------------------------------------------------
|
| Creates customer profile only.
| Does NOT create login account.
|
*/
exports.create = async(req, res, next) => {
  try {
    const {name, mobile, email, address, status = "ACTIVE"} = req.body;
    const cleanName = normalizeText(name);
    const cleanMobile = normalizeMobile(mobile);
    const cleanEmail = normalizeEmail(email);
    if(!cleanName) {
      return res.status(400).json({message: "Customer name is required."});
    }
    if(!cleanMobile) {
      return res.status(400).json({message: "Customer mobile number is required."});
    }
    if(!isValidStatus(status)) {
      return res.status(400).json({message: "Invalid customer status."});
    }
    /*
    |--------------------------------------------------------------------------
    | Duplicate check
    |--------------------------------------------------------------------------
    */
    const duplicateConditions = [{mobile: cleanMobile}];
    if(cleanEmail) {
      duplicateConditions.push({email: cleanEmail});
    }
    const duplicate = await Customer.findOne({where: {[Op.or]: duplicateConditions}});
    if(duplicate) {
      return res.status(409).json({message: "Customer with the same mobile or email already exists." });
    }
    let customerCode = generateCustomerCode();
    /*
     * Extremely unlikely collision,
     * but safe to check.
     */
    while(await Customer.findOne({where: {customerCode}})) {
      customerCode = generateCustomerCode();
    }
    const customer = await Customer.create({customerCode, name: cleanName, mobile: cleanMobile, email: cleanEmail, address: normalizeText(address), status, userId: null});
    return res.status(201).json({message: "Customer created successfully.", data: customer});
  } catch(error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| PUT /api/customers/:id
|--------------------------------------------------------------------------
*/
exports.update = async(req, res, next) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) {
      return res.status(400).json({message: "Invalid customer ID."});
    }
    const customer = await Customer.findByPk(id);
    if(!customer) {
      return res.status(404).json({message: "Customer not found."});
    }
    const allowedFields = ["name", "mobile", "email", "address", "status"];
    const updates = {};
    allowedFields.forEach(field => {
      if(req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });
    if(updates.name !== undefined) {
      updates.name = normalizeText(updates.name);
      if(!updates.name) {
        return res.status(400).json({message: "Customer name cannot be empty."});
      }
    }
    if(updates.mobile !== undefined) {
      updates.mobile = normalizeMobile(updates.mobile);
      if(!updates.mobile) {
        return res.status(400).json({message: "Customer mobile cannot be empty."});
      }
    }
    if(updates.email !== undefined) {
      updates.email = normalizeEmail(updates.email);
    }
    if(updates.address !== undefined) {
      updates.address = normalizeText(updates.address);
    }
    if(updates.status !== undefined && !isValidStatus(updates.status)) {
      return res.status(400).json({message: "Invalid customer status."});
    }
    /*
    |--------------------------------------------------------------------------
    | Duplicate check
    |--------------------------------------------------------------------------
    */
    const duplicateConditions = [];
    if(updates.mobile) {
      duplicateConditions.push({mobile: updates.mobile});
    }
    if(updates.email) {
      duplicateConditions.push({email: updates.email});
    }
    if(duplicateConditions.length) {
      const duplicate = await Customer.findOne({where: {id: {[Op.ne]: customer.id}, [Op.or]: duplicateConditions}});
      if(duplicate) {
        return res.status(409).json({message: "Another customer already uses this mobile or email."});
      }
    }
    await customer.update(updates);
    const updated = await Customer.findByPk(customer.id, {include: [{model: User, as: "user", attributes: ["id", "name", "email", "role", "status"]}]});
    return res.json({message: "Customer updated successfully.", data: updated});
  } catch(error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/customers/:id
|--------------------------------------------------------------------------
*/
exports.remove = async(req, res, next) => {
  try {
    const id = Number(req.params.id);
    if(!Number.isInteger(id) || id < 1) {
      return res.status(400).json({message: "Invalid customer ID."});
    }
    const customer = await Customer.findByPk(id);
    if(!customer) {
      return res.status(404).json({message: "Customer not found."});
    }
    /*
    |--------------------------------------------------------------------------
    | Preserve booking history
    |--------------------------------------------------------------------------
    */
    const bookingCount = await Booking.count({where: {customerId: customer.id}});
    if(bookingCount > 0) {
      return res.status(409).json({message: "Customer cannot be deleted because booking history exists. Set the customer to INACTIVE instead."});
    }
    /*
     * Do not delete linked User automatically.
     * The User account may need separate audit/history.
     */
    if(customer.userId) {
      await User.update({status: "INACTIVE"}, {where: {id: customer.userId}});
    }
    await customer.destroy();
    return res.json({message: "Customer deleted successfully."});
  } catch(error) {
    next(error);
  }
};

/*
|--------------------------------------------------------------------------
| DELETE /api/customers/:id
|--------------------------------------------------------------------------
 */
exports.disable = async(req, res, next) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if(!customer) {
      return res.status(404).json({message: "Customer not found"});
    }

    const updateData = {"isDeleted": 1};
    await customer.update(updateData);

    return res.json({message: "Customer deleted successfully"});
  } catch(error) {
    next(error);
  }
};