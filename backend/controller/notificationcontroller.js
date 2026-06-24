const Notification = require("../models/Notificationmodel");
const logActivity = require("../libs/logger");

const createNotification = async (req, res) => {
  try {
    const { name, type, relatedEntity, relatedEntityId } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: "Name and type are required." });
    }

    const notification = new Notification({ name, type, relatedEntity, relatedEntityId });
    notification.$locals.auditUserId = req.user?._id;
    notification.$locals.auditIpAddress = req.ip;
    await notification.save();

    req.app.get("io")?.emit("newNotification", notification);

    return res.status(201).json({
      success: true,
      message: "Notification created successfully.",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error creating notification.",
      error: error.message,
    });
  }
};

const getAllNotifications = async (_req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json(notifications);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching notifications.", error: error.message });
  }
};

const getUnreadNotifications = async (_req, res) => {
  try {
    const unreadNotifications = await Notification.find({ read: false }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, unreadNotifications });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error fetching unread notifications.",
      error: error.message,
    });
  }
};

const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(id, { read: true }, { new: true });

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    await logActivity({
      action: "NOTIFICATION_READ",
      description: `Notification marked as read: ${notification.name}`,
      module: "notifications",
      entity: "notification",
      entityId: notification._id,
      userId: req.user._id,
      ipAddress: req.ip,
      dedupeKey: `notification:read:${notification._id}:${req.user._id}`,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      notification,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error updating notification.",
      error: error.message,
    });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    await logActivity({
      action: "NOTIFICATION_DELETE",
      description: `Notification deleted: ${notification.name}`,
      module: "notifications",
      entity: "notification",
      entityId: notification._id,
      userId: req.user._id,
      ipAddress: req.ip,
      dedupeKey: `notification:delete:${notification._id}:${req.user._id}`,
    });

    return res.status(200).json({ success: true, message: "Notification deleted successfully." });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error deleting notification.",
      error: error.message,
    });
  }
};

module.exports = {
  createNotification,
  deleteNotification,
  getAllNotifications,
  getUnreadNotifications,
  markAsRead,
};
