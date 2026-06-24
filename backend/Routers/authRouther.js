const express = require("express");
const router = express.Router();
const {
  signup,
  login,
  updateProfile,
  logout,
  staffuser,
  manageruser,
  adminuser,
  removeuser,
  getUserActivityStatus,
  sendOtp,
  verifyOtp,
} = require('../controller/authcontroller');
const { authmiddleware, authorizeRoles } = require('../middleware/Authmiddleware');

router.post("/signup", signup);
router.post("/send-otp", sendOtp);
router.post("/verify-otp", verifyOtp);
router.post("/login", login);
router.delete("/removeuser/:UserId", authmiddleware, authorizeRoles("admin"), removeuser);
router.get("/staffuser", authmiddleware, authorizeRoles("admin"), staffuser);
router.get("/manageruser", authmiddleware, authorizeRoles("admin"), manageruser);
router.get("/adminuser", authmiddleware, authorizeRoles("admin"), adminuser);
router.get("/user-activity-status", authmiddleware, authorizeRoles("admin"), getUserActivityStatus);
router.post("/logout", authmiddleware, logout);
router.put("/updateProfile", authmiddleware, updateProfile);

module.exports = router;
