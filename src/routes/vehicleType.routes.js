const express = require("express");
const router = express.Router();

const controller = require("../controllers/vehicleType.controller");

const {authenticate} = require("../middleware/auth");
const {requirePermission} = require("../middleware/acl");

router.get("/", authenticate, requirePermission("vehicle_types.view"), controller.list);
router.get("/:id", authenticate, requirePermission("vehicle_types.view"), controller.view);
router.post("/", authenticate, requirePermission("vehicle_types.create"), controller.create);
router.put("/:id", authenticate, requirePermission("vehicle_types.update"), controller.update);
router.delete("/:id", authenticate, requirePermission("vehicle_types.delete"), controller.remove);

router.get("/activelist", authenticate, requirePermission("vehicle_types.view"), controller.activeList);

module.exports = router;