const express = require("express");
const router = express.Router();

const controller = require("../controllers/booking.controller");

const {authenticate} = require("../middleware/auth");
const {requirePermission} = require("../middleware/acl");


/**
* @swagger
* /bookings:
*   get:
*     description: Get all bookings
*     tags:
*       - Transports
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.get("/", authenticate, requirePermission("bookings.view"), controller.list);

/**
* @swagger
* /bookings/{id}:
*   get:
*     description: Get one booking
*     tags:
*       - Transports
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the one booking
*         schema:
*           type: string
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.get("/:id", authenticate, requirePermission("bookings.view"), controller.get);

/**
* @swagger
* /bookings:
*   post:
*     description: Create booking
*     tags:
*       - Transports
*     produces:
*       - application/json
*     parameters:
*       - name: customerId
*         description: Booking's customer Id.
*         in: formData
*         required: true
*         type: number
*       - name: pickupLocation
*         description: Booking's pickup location.
*         in: formData
*         required: true
*         type: string
*       - name: dropLocation
*         description: Booking's drop location.
*         in: formData
*         required: true
*         type: string
*       - name: pickupDate
*         description: Booking's pickup date.
*         in: formData
*         required: true
*         type: string
*       - name: pickupTime
*         description: Booking's pickup time.
*         in: formData
*         required: true
*         type: string
*       - name: bookingType
*         description: Booking's type.
*         in: formData
*         required: true
*         type: string
*       - name: vehicleType
*         description: Booking's vehicle type.
*         in: formData
*         required: true
*         type: string
*       - name: fare
*         description: Booking's fare.
*         in: formData
*         required: true
*         type: number
*       - name: remarks
*         description: Booking's customer remarks.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Return bookingCode automatically generate by backend
*/
router.post("/", authenticate, requirePermission("bookings.create"), controller.create);

/**
* @swagger
* /bookings/{id}:
*   put:
*     description: Update booking
*     tags:
*       - Transports
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the booking to update
*         schema:
*           type: string
*       - name: pickupLocation
*         description: Booking's pickup location.
*         in: formData
*         required: true
*         type: string
*       - name: dropLocation
*         description: Booking's drop location.
*         in: formData
*         required: true
*         type: string
*       - name: pickupDate
*         description: Booking's pickup date.
*         in: formData
*         required: true
*         type: string
*       - name: pickupTime
*         description: Booking's pickup time.
*         in: formData
*         required: true
*         type: string
*       - name: bookingType
*         description: Booking's type.
*         in: formData
*         required: true
*         type: string
*       - name: vehicleType
*         description: Booking's vehicle type.
*         in: formData
*         required: true
*         type: string
*       - name: fare
*         description: Booking's fare.
*         in: formData
*         required: true
*         type: number
*       - name: remarks
*         description: Booking's customer remarks.
*         in: formData
*         required: true
*         type: string
*       - name: status
*         description: Vehicle's status.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Return booking details
*/
router.put("/:id", authenticate, requirePermission("bookings.update"), controller.update);


router.delete("/:id", authenticate, requirePermission("bookings.delete"), controller.remove);

/**
* @swagger
* /bookings/{id}/assign-driver:
*   post:
*     description: Assign driver
*     tags:
*       - Transports
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the booking to update
*         schema:
*           type: string
*       - name: driverId
*         description: Booking's driver Id.
*         in: formData
*         required: true
*         type: number
*       - name: vehicleId
*         description: Booking's vehicle Id.
*         in: formData
*         required: true
*         type: number
*       - name: status
*         description: Booking's status.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Return booking details
*/
router.post("/:id/assign-driver", authenticate, requirePermission("bookings.assign"), controller.assignDriver);

/**
* @swagger
* /bookings/{id}/status:
*   post:
*     description: Update booking/trip status
*     tags:
*       - Transports
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the booking to update
*         schema:
*           type: string
*       - name: status
*         description: Booking's status.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Return booking details
*/
router.post("/:id/status", authenticate, requirePermission("bookings.status"), controller.status);


router.post("/:id/cancel", authenticate, requirePermission("bookings.cancel"), controller.cancel);


router.put("/:id/commission", authenticate, requirePermission("bookings.commission"), controller.updateBookingCommission);

module.exports = router;