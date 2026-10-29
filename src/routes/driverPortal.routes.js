const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const { requirePortalRole } = require("../middleware/portalRole.middleware");
const driverController = require("../controllers/driverPortal.controller");

router.use(authenticate, requirePortalRole("DRIVER"));

// Existing dashboard endpoint
router.get("/dashboard", driverController.dashboard);

// Booking endpoints
router.get("/bookings", driverController.listBookings);
router.get("/bookings/:id", driverController.getBooking);
router.post("/bookings/:id/accept", driverController.acceptBooking);
router.post("/bookings/:id/reject", driverController.rejectBooking);
router.post("/bookings/:id/start", driverController.startBooking);
router.post("/bookings/:id/complete", driverController.completeBooking);

module.exports = router;