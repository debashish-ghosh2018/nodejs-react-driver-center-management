const jwt = require("jsonwebtoken");
const { User } = require("../models");

async function authenticate (req, res, next) {
  try {
    //const header = req.headers.authorization || "";
    //const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    //if (!token) return res.status(401).json({ message: "Authentication required" });
    //req.user = jwt.verify(token, process.env.JWT_SECRET);

    const authorization = req.headers.authorization || "";
    const match = authorization.match(/^Bearer\s+(.+)$/i);
      if (!match) {
      return res.status(401).json({
          success: false,
          message: "Authentication token is required"
      });
    }

    if (!process.env.JWT_SECRET) {
      return next(
          new Error("JWT_SECRET is not configured")
      );
    }
  
    const decoded = jwt.verify(
      match[1],
      process.env.JWT_SECRET,
      { algorithms: ["HS256"] }
    );

    const userId = Number(decoded.id || decoded.sub);

    if (!Number.isSafeInteger(userId) || userId <= 0) {
        return res.status(401).json({
            success: false,
            message: "Invalid authentication token"
        });
    }

    const user = await User.findByPk(userId, {
      attributes: [
          "id",
          "name",
          "email",
          "role",
          "status"
      ]
    });

    if (!user || user.status !== "ACTIVE") {
      return res.status(401).json({
          success: false,
          message: "User account is inactive or unavailable"
      });
    }

    // Use current database values, not untrusted
    // role or status claims from the JWT.
    req.user = user;

    next();
  } catch (error) {
    //return res.status(401).json({ message: "Invalid or expired token" });

    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError" || error.name === "NotBeforeError") {
      return res.status(401).json({
          success: false,
          message: "Invalid or expired authentication token"
      });
    }

    next(error);
  }
}

function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Insufficient permissions" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };