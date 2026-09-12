const {Op} = require("sequelize");

function normalizePagination(page, limit, maxLimit = 100) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 20, 1), maxLimit);
  return {
    page: safePage,
    limit: safeLimit,
    offset: (safePage - 1) * safeLimit
  };
}

function pickAllowedFields(source, allowedFields = []) {
  const result = {};
  allowedFields.forEach(field => {
    if(source[field] !== undefined) {
      result[field] = source[field];
    }
  });
  return result;
}

function buildSearchWhere(search, searchFields = []) {
  if(!search || !String(search).trim() || !searchFields.length) {
    return null;
  }
  const keyword = `%${String(search).trim()}%`;
  return {
    [Op.or]: searchFields.map(field => ({
      [field]: {
        [Op.like]: keyword
      }
    }))
  };
}

function buildFilters(query, filterFields = {}) {
  const where = {}; //console.log(filterFields); console.log(query);
  Object.entries(filterFields).forEach(
    ([queryKey, config]) => { //console.log(queryKey); console.log(config);
      const value = query[queryKey];
      if(value === undefined || value === null || value === "") {
        return;
      }
      /*
       * Simple format:
       *
       * {
       *   status: "status"
       * }
       */
      if(typeof config === "string") {
        where[config] = value;  //where[queryKey] = value; 
        return;
      }
      /*
       * Advanced format:
       *
       * {
       *   status: {
       *     field: "status",
       *     type: "enum",
       *     values: [...]
       *   }
       * }
       */
      const field = config.field || queryKey;
      switch(config.type) {
        case "number":
          if(Number.isFinite(Number(value))) {
            where[field] = Number(value);
          }
          break;
        case "boolean":
          if(value === true || value === "true" || value === "1") {
            where[field] = true;
          }
          if(value === false || value === "false" || value === "0") {
            where[field] = false;
          }
          break;
        case "enum":
          if(!config.values || config.values.includes(value)) {
            where[field] = value;
          }
          break;
        case "like":
          where[field] = {[Op.like]: `%${String(value).trim()}%`};
          break;
        case "gte":
          where[field] = {...(where[field] || {}), [Op.gte]: value
          };
          break;
        case "lte":
          where[field] = {...(where[field] || {}), [Op.lte]: value
          };
          break;
        default:
          where[field] = value;
      }
    }); //console.log(where);
  return where;
}

function getSafeSort(sortBy, sortOrder, allowedSortFields = [], defaultSort = ["createdAt", "DESC"]) {
  const defaultField = defaultSort[0];
  const defaultOrder = defaultSort[1] || "DESC";
  const field = allowedSortFields.includes(sortBy) ? sortBy : defaultField;
  const order = String(sortOrder || defaultOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";
  return [
    field,
    order
  ];
}

function createCrud(Model, options = {}) {
  if(!Model) {
    throw new Error("Model is required for CRUD controller.");
  }
  const {
    modelName = Model.name,
      searchFields = [],
      filterFields = {},
      allowedSortFields = ["id", "createdAt", "updatedAt"],
      defaultSort = ["createdAt", "DESC"],
      defaultLimit = 20,
      maxLimit = 100,
      createFields = [],
      updateFields = [],
      includes = [],
      detailIncludes = includes,
      listAttributes,
      detailAttributes,
      beforeList,
      afterList,
      beforeCreate,
      afterCreate,
      beforeUpdate,
      afterUpdate,
      beforeDelete,
      afterDelete,
      validateCreate,
      validateUpdate,
      validateDelete,
      whereBuilder,
      findOptionsBuilder,
      transactionProvider
  } = options;

  /*
  |--------------------------------------------------------------------------
  | LIST
  |--------------------------------------------------------------------------
  */
  const list = async(req, res, next) => {
    try {
      const {search, page = 1, limit = defaultLimit, sortBy, sortOrder, ...cFilters} = req.query;  //console.log(req.query); console.log(search);
      const pagination = normalizePagination(page, limit, maxLimit);
      let where = {};
      //let filterFields = cFilters;

      /*
       * Search
       */
      const searchWhere = buildSearchWhere(search, searchFields); console.log(search); console.log(searchWhere);
      if(searchWhere) {
        Object.assign(where, searchWhere);
      }
      /*
       * Filters
       */
      const filters = buildFilters(req.query, filterFields);  //console.log(filters);
      where = {...where, ...filters};
      /*
       * Optional custom
       * where builder.
       */
      if(whereBuilder) {
        const customWhere = await whereBuilder(req, where);
        if(customWhere) {
          where = customWhere;
        }
      }
      if(beforeList) {
        await beforeList(req, {where});
      }
      const order = getSafeSort(sortBy, sortOrder, allowedSortFields, defaultSort);
      let findOptions = {
        where,
        include: includes,
        order: [
          order
        ],
        limit: pagination.limit,
        offset: pagination.offset,
        distinct: true
      };
      if(listAttributes) {
        findOptions.attributes = listAttributes;
      }
      if(findOptionsBuilder) {
        const customOptions = await findOptionsBuilder(req, findOptions);
        if(customOptions) {
          findOptions = customOptions;
        }
      }
      console.log(findOptions);
      const result = await Model.findAndCountAll(findOptions);   //console.log(result);
      let response = {
        data: result.rows,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total: result.count,
          totalPages: Math.ceil(result.count / pagination.limit)
        }
      };
      if(afterList) {
        const modified = await afterList(req, response);
        if(modified) {
          response = modified;
        }
      }
      return res.json(response);
    } catch(error) {
      next(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | GET ONE
  |--------------------------------------------------------------------------
  */
  const get = async(req, res, next) => {
    try {
      const id = Number(req.params.id);
      if(!Number.isInteger(id) || id < 1) {
        return res.status(400).json({message: `Invalid ${modelName} ID.`});
      }
      const options = {include: detailIncludes};
      if(detailAttributes) {
        options.attributes = detailAttributes;
      }
      const item = await Model.findByPk(id, options);
      if(!item) {
        return res.status(404).json({message: `${modelName} not found.`});
      }
      return res.json(item);
    } catch(error) {
      next(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | CREATE
  |--------------------------------------------------------------------------
  */
  const create = async(req, res, next) => {
    let transaction = null;
    try {
      if(transactionProvider) {
        transaction = await transactionProvider();
      }
      let payload = createFields.length ? pickAllowedFields(req.body, createFields) : {...req.body};
      if(validateCreate) {
        const validation = await validateCreate(req, payload);
        if(validation && validation.valid === false) {
          if(transaction) {
            await transaction.rollback();
          }
          return res.status(validation.status || 400).json({message: validation.message || "Validation failed.", errors: validation.errors});
        }
      }
      if(beforeCreate) {
        const modifiedPayload = await beforeCreate(req, payload, transaction);
        if(modifiedPayload) {
          payload = modifiedPayload;
        }
      }
      const item = await Model.create(payload, transaction ? {transaction} : undefined);
      if(afterCreate) {
        await afterCreate(req, item, transaction);
      }
      if(transaction) {
        await transaction.commit();
      }
      return res.status(201).json({message: `${modelName} created successfully.`, data: item});
    } catch(error) {
      if(transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | UPDATE
  |--------------------------------------------------------------------------
  */
  const update = async(req, res, next) => {
    let transaction = null;
    try {
      const id = Number(req.params.id);
      if(!Number.isInteger(id) || id < 1) {
        return res.status(400).json({message: `Invalid ${modelName} ID.`});
      }
      if(transactionProvider) {
        transaction = await transactionProvider();
      }
      const item = await Model.findByPk(id, transaction ? {transaction} : undefined);
      if(!item) {
        if(transaction) {
          await transaction.rollback();
        }
        return res.status(404).json({message: `${modelName} not found.`});
      }
      let payload = updateFields.length ? pickAllowedFields(req.body, updateFields) : {...req.body};
      if(validateUpdate) {
        const validation = await validateUpdate(req, payload, item);
        if(validation && validation.valid === false) {
          if(transaction) {
            await transaction.rollback();
          }
          return res.status(validation.status || 400).json({message: validation.message || "Validation failed.", errors: validation.errors});
        }
      }
      if(beforeUpdate) {
        const modifiedPayload = await beforeUpdate(req, payload, item, transaction);
        if(modifiedPayload) {
          payload = modifiedPayload;
        }
      }
      await item.update(payload, transaction ? {transaction} : undefined);
      if(afterUpdate) {
        await afterUpdate(req, item, transaction);
      }
      if(transaction) {
        await transaction.commit();
      }
      return res.json({message: `${modelName} updated successfully.`, data: item});
    } catch(error) {
      if(transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DELETE
  |--------------------------------------------------------------------------
  */
  const remove = async(req, res, next) => {
    let transaction = null;
    try {
      const id = Number(req.params.id);
      if(!Number.isInteger(id) || id < 1) {
        return res.status(400).json({message: `Invalid ${modelName} ID.`});
      }
      if(transactionProvider) {
        transaction = await transactionProvider();
      }
      const item = await Model.findByPk(id, transaction ? {transaction} : undefined);
      if(!item) {
        if(transaction) {
          await transaction.rollback();
        }
        return res.status(404).json({message: `${modelName} not found.`});
      }
      if(validateDelete) {
        const validation = await validateDelete(req, item);
        if(validation && validation.valid === false) {
          if(transaction) {
            await transaction.rollback();
          }
          return res.status(validation.status || 400).json({message: validation.message || "Delete not allowed."});
        }
      }
      if(beforeDelete) {
        await beforeDelete(req, item, transaction);
      }
      await item.destroy(transaction ? {transaction} : undefined);
      if(afterDelete) {
        await afterDelete(req, item, transaction);
      }
      if(transaction) {
        await transaction.commit();
      }
      return res.json({message: `${modelName} deleted successfully.`});
    } catch(error) {
      if(transaction) {
        await transaction.rollback();
      }
      next(error);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | DISABLE
  |--------------------------------------------------------------------------
  */
  const disable = async (req, res, next) => {
    let transaction = null;
    try {
      const id = Number(req.params.id);
      if(!Number.isInteger(id) || id < 1) {
        return res.status(400).json({message: `Invalid ${modelName} ID.`});
      }
      if(transactionProvider) {
        transaction = await transactionProvider();
      }
      const item = await Model.findByPk(id, transaction ? {transaction} : undefined);
      if(!item) {
        if(transaction) {
          await transaction.rollback();
        }
        return res.status(404).json({message: `${modelName} not found.`});
      }
      await row.update({isDeleted: 1}, transaction ? {transaction} : undefined);
      if(transaction) {
        await transaction.commit();
      }
      return res.json({message: `${modelName} deleted successfully.`});
    } catch (e) { 
      if(transaction) {
        await transaction.rollback();
      }
      next(e); 
    }
  }

  return {list, get, create, update, remove, disable};
}

module.exports = {createCrud};