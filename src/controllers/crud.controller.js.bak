function createCrud(Model, options = {}) {
  const searchable = options.searchable || [];

  return {
    list: async (req, res, next) => {
      try {
        const where = {};
        if (req.query.isDeleted) where.isDeleted = req.query.isDeleted;
        if (req.query.status) where.status = req.query.status;
        const rows = await Model.findAll({ where, order: [["id", "DESC"]] });
        res.json(rows);
      } catch (e) { next(e); }
    },

    get: async (req, res, next) => {
      try {
        const row = await Model.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: "Record not found" });
        res.json(row);
      } catch (e) { next(e); }
    },

    create: async (req, res, next) => {
      try {
        const row = await Model.create(req.body);
        res.status(201).json(row);
      } catch (e) { next(e); }
    },

    update: async (req, res, next) => {
      try {
        const row = await Model.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: "Record not found" });
        await row.update(req.body);
        res.json(row);
      } catch (e) { next(e); }
    },

    remove: async (req, res, next) => {
      try {
        const row = await Model.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: "Record not found" });
        await row.destroy();
        res.json({ message: "Deleted successfully" });
      } catch (e) { next(e); }
    },

    disable: async (req, res, next) => {
      try {
        const row = await Model.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: "Record not found" });
        await row.update({isDeleted: 1});
        res.json({ message: "Deleted successfully" });
      } catch (e) { next(e); }
    }
  };
}

module.exports = { createCrud };
