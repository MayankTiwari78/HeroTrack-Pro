const express = require("express");
const {
  createActivityLog,
  deleteActivityLog,
  getAllActivityLogs,
  getRecentActivityLogs,
  getUserActivityLogs,
} = require("../controller/activitycontroller");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

const router = express.Router();

router.use(authmiddleware, authorizeRoles("admin", "manager"));
router.post("/addLog", createActivityLog);
router.get("/getAllLogs", getAllActivityLogs);
router.get("/getrecentActivitys", getRecentActivityLogs);
router.get("/getLogs/:userid", getUserActivityLogs);
router.delete("/deleteLog", authorizeRoles("admin"), deleteActivityLog);

module.exports = router;
