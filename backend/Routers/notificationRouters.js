const express = require("express");
const router = express.Router();
const {createNotification,getAllNotifications,getUnreadNotifications,markAsRead,deleteNotification}= require("../controller/notificationcontroller");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.post("/createNotification",authorizeRoles("admin"), createNotification);
router.get("/allNotification", getAllNotifications);
router.get("/unreadNotification", getUnreadNotifications);
router.put("/:id/readNotification", markAsRead);
router.delete("/deleteNotification/:id/", authorizeRoles("admin"), deleteNotification);

module.exports = router;
