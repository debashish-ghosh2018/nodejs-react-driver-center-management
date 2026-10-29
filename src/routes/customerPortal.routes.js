const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { requirePortalRole } = require("../middleware/portalRole.middleware");

const customerController = require("../controllers/customerPortal.controller");
const controllerVehicleType = require("../controllers/vehicleType.controller");

router.use(authenticate, requirePortalRole("CUSTOMER"));

// Existing dashboard endpoint
router.get("/dashboard", customerController.dashboard);

// Booking endpoints
router.get("/bookings", customerController.listBookings);
router.get("/bookings/:id", customerController.getBooking);
router.post("/bookings", customerController.createBooking);
router.put("/bookings/:id", customerController.updateBooking);
router.post("/bookings/:id/cancel", customerController.cancelBooking);

router.get("/vehicle-types", controllerVehicleType.activeList);


module.exports = router;