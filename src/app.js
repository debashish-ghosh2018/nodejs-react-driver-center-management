require("dotenv").config();

const express = require("express"); //  is a minimal, fast, and unopinionated web application framework for Node.js designed to build robust web applications and REST APIs. It acts as a lightweight layer on top of Node.js's built-in HTTP modules, making it much easier to manage routing, handle requests, and integrate middleware.
//const bodyParser = require('body-parser'); // Body-parser is a Node.js middleware that parses incoming request bodies in a middleware before your handlers, available under the req.body property. It supports parsing of JSON, URL-encoded, and raw data. Link: https://www.npmjs.com/package/body-parser
const cors = require("cors"); // CORS is a Node.js middleware for Express/Connect that sets CORS response headers. These headers tell browsers which origins can read responses from your server. Link: https://www.npmjs.com/package/cors
const helmet = require("helmet"); // Helmet helps secure Node/Express apps. It sets HTTP response headers such as Content-Security-Policy and Strict-Transport-Security. It aims to be quick to integrate and be low maintenance afterward. Link: https://www.npmjs.com/package/helmet, https://github.com/helmetjs/helmet
const morgan = require("morgan"); // HTTP request logger middleware for node.js Link: https://www.npmjs.com/package/morgan
const rateLimit=require("express-rate-limit");  // Basic rate-limiting middleware for Express. Use to limit repeated requests to public APIs and/or endpoints such as password reset. Plays nice with express-slow-down and ratelimit-header-parser. Link: https://www.npmjs.com/package/express-rate-limit
const swaggerUi=require("swagger-ui-express");  // This module allows you to serve auto-generated swagger-ui generated API docs from express, based on a swagger.json file. The result is living documentation for your API hosted from your API server via a route. Link: https://www.npmjs.com/package/swagger-ui-express, https://github.com/Surnet/swagger-jsdoc
const swaggerSpec=require("./swagger");
const path = require("path");



const authRoutes = require("./routes/auth.routes");
const customerRoutes = require("./routes/customer.routes");
const driverRoutes = require("./routes/driver.routes");
const vehicleRoutes = require("./routes/vehicle.routes");
const vehicleTypeRoutes = require("./routes/vehicleType.routes");
const bookingRoutes = require("./routes/booking.routes");
const paymentRoutes = require("./routes/payment.routes");
const adminUserRoutes = require("./routes/adminUser.routes");
const adminCustomerRoutes = require("./routes/adminCustomer.routes");
const adminDriverRoutes = require("./routes/adminDriver.routes");
const adminSettingsRoutes = require("./routes/adminSettings.routes");
const aclRoutes = require("./routes/acl.routes");
//const driverEarningRoutes = require("./routes/driverEarning.routes");
//const ratingRoutes = require("./routes/rating.routes");
//const notificationRoutes = require("./routes/notification.routes");
//const reportRoutes = require("./routes/report.routes");
//const auditRoutes = require("./routes/audit.routes");



//const authRoutes = require("./routes/auth.routes");
//const adminApiRoutes = require("./routes/admin-api.routes");
//const adminSettingsRoutes = require("./routes/adminSettings.routes");
const apiRoutes = require("./routes");
const extendedRoutes=require("./routes/extended.routes");


const { notFound, errorHandler } = require("./middleware/error");

const app = express();

// Parse JSON requests
//app.use(bodyParser.urlencoded({ extended: true }));
// parse application/x-www-form-urlencoded
//app.use(bodyParser.urlencoded())
// parse application/json
//app.use(bodyParser.json())

app.use(helmet({ 
  /*contentSecurityPolicy: {
    directives: {
      "default-src": ["'self'"],
      "script-src": ["'self'", "https://cdn.jsdelivr.net"],
      "style-src": ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      "font-src": ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "data:"],
      "img-src": ["'self'", "data:", "blob:"],
      "connect-src": ["'self'", "ws:", "wss:"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "style-src-elem": ["'self'"],
      "frame-ancestor": ["'self'"]
    }
  },  
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "https://cdn.jsdelivr.net"],
      scriptSrcAttr: ["'unsafe-inline'"],
      connectSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://cdn.jsdelivr.net", "https://fonts.gstatic.com", "data:"],
      imgSrc: ["'self'", "data:", "blob:"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'self'"]
    }
  },
  crossOriginResourcePolicy: {
    policy: "cross-origin"
  },*/
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: false 
}));
//app.use(cors({ origin: process.env.CORS_ORIGIN || "*", credentials: true }));

// Allowed React frontend origins
const allowedOrigins = ["http://localhost:5173", "http://127.0.0.1:5173", process.env.CORS_ORIGIN || "*"];

// CORS configuration
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests without Origin (e.g. Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));


// Parse JSON requests
app.use(express.json({ limit: "22mb" }));

// Parse application/x-www-form-urlencoded requests
app.use(express.urlencoded({ extended: true }));


app.use(morgan("dev"));
app.use("/api/",rateLimit({windowMs:15*60*1000,limit:300}));
app.use("/api-docs",swaggerUi.serve,swaggerUi.setup(swaggerSpec));

app.use("/admin", express.static(path.join(__dirname, "../public/admin")));


/**
* get:
*   description: Useful for deployment monitoring
* produces:
*   application/json
*/
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "driver-center-api", time: new Date().toISOString() });
});

/*
 * Authentication
 */
app.use("/api/auth", authRoutes);

/*
 * Core modules
 */
app.use("/api/customers", customerRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/vehicle-types", vehicleTypeRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
//app.use("/api/driver-earnings", driverEarningRoutes);
//app.use("/api/ratings", ratingRoutes);
//app.use("/api/notifications", notificationRoutes);
//app.use("/api/reports", reportRoutes);

/*
 * Admin modules
 */
app.use("/api/admin/users", adminUserRoutes);
app.use("/api/admin/customers", adminCustomerRoutes);
app.use("/api/admin/drivers", adminDriverRoutes);
app.use("/api/admin/settings", adminSettingsRoutes);
app.use("/api/admin/acl", aclRoutes);
//app.use("/api/admin/audit", auditRoutes);

const customerPortalRoutes = require("./routes/customerPortal.routes");
const driverPortalRoutes = require("./routes/driverPortal.routes");
app.use("/api/customer", customerPortalRoutes);
app.use("/api/driver", driverPortalRoutes);

//app.use("/api/auth", authRoutes);
//app.use("/api/admin", adminApiRoutes);
app.use("/api", apiRoutes);
app.use("/api",extendedRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;