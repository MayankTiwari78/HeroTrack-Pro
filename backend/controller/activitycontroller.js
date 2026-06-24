const ActivityLog = require("../models/ActivityLogmodel");
const logActivity = require("../libs/logger");

const createActivityLog = async (req, res) => {
  try {
    const { action, description, module, entity, entityId, status } = req.body;
    const activity = await logActivity({
      action,
      description,
      module: module || entity || "system",
      entity,
      entityId,
      status,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    if (!activity) {
      return res.status(400).json({
        success: false,
        message: "Action and description are required.",
      });
    }

    return res.status(201).json(activity);
  } catch (error) {
    return res.status(500).json({ success: false, message: "Failed to create log", error: error.message });
  }
};

const getAllActivityLogs = async (req, res) => {
  try {
    const requestedLimit = Number.parseInt(req.query.limit, 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), 1000)
      : 500;
    const logs = await ActivityLog.find()
      .populate("userId", "name email role ProfilePic")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch logs", error: error.message });
  }
};

const getRecentActivityLogs = async (_req, res) => {
  try {
    const logs = await ActivityLog.find()
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch logs", error: error.message });
  }
};

const getUserActivityLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find({ userId: req.params.userid })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json(logs);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch user logs", error: error.message });
  }
};

const deleteActivityLog = async (req, res) => {
  try {
    const deletedLog = await ActivityLog.findByIdAndDelete(req.body.id);
    if (!deletedLog) return res.status(404).json({ message: "Log not found" });

    return res.status(200).json({ success: true, message: "Log deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete log", error: error.message });
  }
};

module.exports = {
  createActivityLog,
  deleteActivityLog,
  getAllActivityLogs,
  getRecentActivityLogs,
  getUserActivityLogs,
};
