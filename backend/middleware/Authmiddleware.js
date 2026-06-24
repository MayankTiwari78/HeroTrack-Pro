const jwt = require("jsonwebtoken");
const User = require("../models/Usermodel");
const { ONLINE_WINDOW_MS, touchUserPresence } = require("../services/presenceService");
require("dotenv").config();

const activeRoles = ["admin", "manager", "staff"];

const authmiddleware = async (req, res, next) => {
  try {
    const cookieToken = req.cookies?.Inventorymanagmentsystem;

    const authHeader = req.headers.authorization || "";
    const headerToken = authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized: No token provided.",
      });
    }

    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

    if (!decodedToken?.userId) {
      return res.status(401).json({
        message: "Unauthorized: Invalid token.",
      });
    }

    const user = await User.findById(decodedToken.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized: User not found.",
      });
    }

    if (!activeRoles.includes(user.role)) {
      return res.status(403).json({
        message: "403 Unauthorized: Role is no longer active.",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        message: "Account is inactive. Contact administrator."
      });
    }

    const wasActive =
      user.isOnline &&
      user.lastSeen &&
      Date.now() - new Date(user.lastSeen).getTime() <= ONLINE_WINDOW_MS;

    const activeUser = await touchUserPresence(user);

    req.user = activeUser;

    if (!wasActive) {
      req.app
        .get("io")
        ?.emit("presence:update", {
          userId: activeUser._id,
          status: "online",
        });
    }

    return next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({
      message: "Unauthorized: Invalid or expired token.",
    });
  }
};

const authorizeRoles = (...roles) => {
  const allowedRoles = roles.filter((role) =>
    activeRoles.includes(role)
  );

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized: Login required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "403 Unauthorized: Access denied for this role.",
      });
    }

    return next();
  };
};

module.exports = {
  authmiddleware,
  authorizeRoles,
  adminmiddleware: authorizeRoles("admin"),
  managermiddleware: authorizeRoles("manager"),
};