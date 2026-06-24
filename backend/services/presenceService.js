const User = require("../models/Usermodel");

const ONLINE_WINDOW_MS = 5 * 60 * 1000;
const IDLE_WINDOW_MS = 15 * 60 * 1000;

const minutesBetween = (start, end) => {
  if (!start || !end) return 0;
  return Math.max(0, (new Date(end).getTime() - new Date(start).getTime()) / 60000);
};

const roundMinutes = (value) => Math.round((Number(value) || 0) * 100) / 100;

const getPresenceStatus = (user, now = new Date()) => {
  if (!user?.lastSeen) return "offline";
  const age = now.getTime() - new Date(user.lastSeen).getTime();
  if (user.isOnline && age <= ONLINE_WINDOW_MS) return "online";
  if (user.currentSessionStart && age <= IDLE_WINDOW_MS) return "idle";
  return "offline";
};

const closeSessionUpdate = (user, endTime) => ({
  $set: { isOnline: false, currentSessionStart: null },
  $inc: { totalActiveTime: roundMinutes(minutesBetween(user.currentSessionStart, endTime)) },
});

const touchUserPresence = async (user, now = new Date()) => {
  const lastSeen = user.lastSeen ? new Date(user.lastSeen) : null;
  const inactiveFor = lastSeen ? now.getTime() - lastSeen.getTime() : Infinity;
  const update = { $set: { lastSeen: now, isOnline: true } };

  if (!user.currentSessionStart || inactiveFor > ONLINE_WINDOW_MS) {
    update.$set.currentSessionStart = now;
    if (user.currentSessionStart && lastSeen) {
      update.$inc = { totalActiveTime: roundMinutes(minutesBetween(user.currentSessionStart, lastSeen)) };
    }
  }

  return User.findByIdAndUpdate(user._id, update, { new: true }).select("-password");
};

const sweepInactiveUsers = async (io, now = new Date()) => {
  const onlineCutoff = new Date(now.getTime() - ONLINE_WINDOW_MS);
  const offlineCutoff = new Date(now.getTime() - IDLE_WINDOW_MS);

  const newlyIdle = await User.updateMany(
    { isOnline: true, lastSeen: { $lt: onlineCutoff } },
    { $set: { isOnline: false } }
  );

  const staleSessions = await User.find({
    currentSessionStart: { $ne: null },
    lastSeen: { $lt: offlineCutoff },
  }).select("_id currentSessionStart lastSeen totalActiveTime");

  if (staleSessions.length) {
    await User.bulkWrite(staleSessions.map((user) => ({
      updateOne: {
        filter: { _id: user._id, currentSessionStart: user.currentSessionStart },
        update: closeSessionUpdate(user, user.lastSeen),
      },
    })));
  }

  if (newlyIdle.modifiedCount || staleSessions.length) {
    io?.emit("presence:update", { changed: true, at: now.toISOString() });
  }

  return { idle: newlyIdle.modifiedCount, offline: staleSessions.length };
};

module.exports = {
  ONLINE_WINDOW_MS,
  IDLE_WINDOW_MS,
  getPresenceStatus,
  minutesBetween,
  roundMinutes,
  touchUserPresence,
  sweepInactiveUsers,
};
