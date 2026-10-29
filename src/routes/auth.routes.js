const router = require("express").Router();

const controller = require("../controllers/auth.controller");

const {authenticate} = require("../middleware/auth");


  /**
   * @swagger
   * definitions:
   *   Login:
   *     required:
   *       - email
   *       - password
   *     properties:
   *       email:
   *         type: string
   *       password:
   *         type: string
   *       path:
   *         type: string
   */

  /**
   * @swagger
   * tags:
   *   - name: Login
   *     description: Use for admin Login
   *   - name: Users
   *     description: User management and login
   */

  /**
   * @swagger
   * /login:
   *   post:
   *     description: Login to the application
   *     tags: [Users, Login]
   *     produces:
   *       - application/json
   *     parameters:
   *       - name: email
   *         description: User's email.
   *         in: formData
   *         required: true
   *         type: string
   *       - name: password
   *         description: User's password.
   *         in: formData
   *         required: true
   *         type: string
   *     responses:
   *       200:
   *         description: login
   */
router.post("/login", controller.login);

router.get("/me",authenticate,controller.me);

//router.post("/change-password",authenticate,controller.changePassword);

module.exports = router;
