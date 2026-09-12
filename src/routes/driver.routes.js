const express = require("express");
const router = express.Router();

const controller = require("../controllers/driver.controller");

const {authenticate} = require("../middleware/auth");
const {requirePermission} = require("../middleware/acl");


/**
* @swagger
* /drivers:
*   get:
*     description: Get all drivers
*     tags:
*       - Users
*     produces:
*       - application/json
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.get("/", authenticate, requirePermission("drivers.view"), controller.list);

/**
* @swagger
* /drivers/{id}:
*   get:
*     description: Get driver
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the driver
*         schema:
*           type: string
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.get("/:id", authenticate, requirePermission("drivers.view"), controller.get);

/**
* @swagger
* /drivers:
*   post:
*     description: Create driver
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: name
*         description: Driver's name.
*         in: formData
*         required: true
*         type: string
*       - name: mobile
*         description: Driver's mobile.
*         in: formData
*         required: true
*         type: string
*       - name: email
*         description: Driver's email.
*         in: formData
*         required: true
*         type: string
*       - name: address
*         description: Driver's address.
*         in: formData
*         required: true
*         type: string
*       - name: licenseNo
*         description: Driver's license No.
*         in: formData
*         required: true
*         type: string
*       - name: licenseExpiry
*         description: Driver's license Expiry Date.
*         in: formData
*         required: true
*         type: string
*       - name: experienceYears
*         description: Driver's experience in Years.
*         in: formData
*         required: true
*         type: number
*     responses:
*       200:
*         description: Return driverCode automatically generate by backend
*/
router.post("/", authenticate, requirePermission("drivers.create"), controller.create);

/**
* @swagger
* /drivers/{id}:
*   put:
*     description: Update driver
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the driver to update
*         schema:
*           type: string
*       - name: licenseExpiry
*         description: Driver's license Expiry Date.
*         in: formData
*         required: true
*         type: string
*       - name: experienceYears
*         description: Driver's experience in Years.
*         in: formData
*         required: true
*         type: number
*       - name: status
*         description: Customer's status.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Return driver details
*/
router.put("/:id", authenticate, requirePermission("drivers.update"), controller.update);

/**
* @swagger
* /drivers/{id}:
*   delete:
*     description: Delete driver
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the driver to delete
*         schema:
*           type: string
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.delete("/:id", authenticate, requirePermission("drivers.delete"), controller.disable);

/**
* @swagger
* /drivers/{id}/availability:
*   put:
*     description: Update driver availability
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the driver to update availability
*         schema:
*           type: string
*       - name: availability
*         description: Driver's availability status.
*         in: formData
*         required: true
*         type: string
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.put("/:id/availability", authenticate, requirePermission("drivers.availability"), controller.availability);

/**
* @swagger
* /drivers/{id}/location:
*   delete:
*     description: Gert driver location
*     tags:
*       - Users
*     produces:
*       - application/json
*     parameters:
*       - name: id
*         in: path
*         required: true
*         description: The ID of the driver to delete
*         schema:
*           type: string
*     responses:
*       200:
*         description: Used by the admin dashboard.
*/
router.get("/:id/location", authenticate, requirePermission("drivers.location"), controller.location);

module.exports = router;