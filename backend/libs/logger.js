const ActivityLog = require("../models/ActivityLogmodel");

let socketServer;

const cleanIpAddress = (ipAddress) => {
  if (!ipAddress) return undefined;
  return String(ipAddress).replace(/^::ffff:/, "").slice(0, 128);
};

const logActivity = async ({
  action,
  description,
  module,
  entity,
  entityId,
  userId,
  ipAddress,
  loginTime,
  logoutTime,
  duration,
  status = "success",
  dedupeKey,
}) => {
  let activityDedupeKey;
  try {
    if (!action || !description) return null;

    const normalizedAction = String(action).trim().toUpperCase().replace(/\s+/g, "_");
    const resolvedModule = String(module || entity || "system").trim().toLowerCase();
    const bucket = Math.floor(Date.now() / 2000);
    activityDedupeKey = dedupeKey || [normalizedAction, userId || "system", entityId || "none", bucket].join(":");
    const payload = {
      action: normalizedAction,
      description: String(description).trim(),
      module: resolvedModule,
      entity: entity || resolvedModule,
      entityId,
      userId,
      ipAddress: cleanIpAddress(ipAddress),
      loginTime,
      logoutTime,
      duration: Number.isFinite(Number(duration)) ? Math.max(0, Number(duration)) : 0,
      status,
      dedupeKey: activityDedupeKey,
    };

    const existingActivity = await ActivityLog.findOne({ dedupeKey: activityDedupeKey })
      .populate("userId", "name email role ProfilePic");
    if (existingActivity) return existingActivity;

    const createdActivity = await ActivityLog.create(payload);
    const activity = await ActivityLog.findById(createdActivity._id)
      .populate("userId", "name email role ProfilePic");

    socketServer?.emit("newActivityLog", activity);
    return activity;
  } catch (error) {
    if (error?.code === 11000 && activityDedupeKey) {
      return ActivityLog.findOne({ dedupeKey: activityDedupeKey }).populate("userId", "name email role ProfilePic");
    }
    if (error?.code !== 11000) console.error("Error logging activity:", error.message);
    return null;
  }
};

logActivity.setSocketServer = (io) => {
  socketServer = io;
};

module.exports = logActivity;
