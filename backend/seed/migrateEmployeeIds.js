const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../models/Usermodel");

const ROLE_PREFIXES = {
  admin: "ADMIN",
  manager: "MGR",
  staff: "EMP",
};

const ROLE_BY_PREFIX = Object.entries(ROLE_PREFIXES).reduce((result, [role, prefix]) => {
  result[prefix] = role;
  return result;
}, {});

const AUTH_FIELDS = ["email", "password", "role", "isActive"];

const isEmptyEmployeeId = (value) => {
  if (value === undefined || value === null) return true;
  return typeof value === "string" && value.trim() === "";
};

const normalizeEmployeeId = (value) => String(value || "").trim().toUpperCase();

const normalizeRole = (role) => String(role || "").trim().toLowerCase();

const formatEmployeeId = (prefix, count) => `${prefix}${String(count).padStart(3, "0")}`;

const buildEmptyEmployeeIdFilter = (userId) => ({
  _id: userId,
  $or: [
    { employeeId: { $exists: false } },
    { employeeId: null },
    { employeeId: "" },
    { employeeId: /^\s*$/ },
  ],
});

const buildAuthSnapshot = (user) =>
  AUTH_FIELDS.reduce((snapshot, field) => {
    snapshot[field] = user[field] === undefined ? null : String(user[field]);
    return snapshot;
  }, {});

const snapshotsMatch = (before, afterUser) => {
  const after = buildAuthSnapshot(afterUser);
  return AUTH_FIELDS.every((field) => before[field] === after[field]);
};

const getBulkCount = (result, key) => {
  if (!result) return 0;
  if (typeof result[key] === "number") return result[key];
  if (result.result && typeof result.result[key] === "number") return result.result[key];
  return 0;
};

const findDuplicateEmployeeIds = (users) => {
  const seen = new Set();
  const duplicates = new Set();

  users.forEach((user) => {
    if (isEmptyEmployeeId(user.employeeId)) return;

    const normalizedEmployeeId = normalizeEmployeeId(user.employeeId);
    if (seen.has(normalizedEmployeeId)) {
      duplicates.add(normalizedEmployeeId);
      return;
    }
    seen.add(normalizedEmployeeId);
  });

  return Array.from(duplicates).sort();
};

const run = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required to migrate employee IDs.");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to MongoDB");

  const users = await User.find({})
    .select("_id name email password role employeeId isActive createdAt")
    .sort({ createdAt: 1, _id: 1 })
    .lean();

  const totalUsersScanned = users.length;
  const usedEmployeeIds = new Set();
  const roleCounters = Object.keys(ROLE_PREFIXES).reduce((result, role) => {
    result[role] = 0;
    return result;
  }, {});
  const existingEmployeeIdsByUser = new Map();
  const authSnapshotByUser = new Map();

  users.forEach((user) => {
    authSnapshotByUser.set(String(user._id), buildAuthSnapshot(user));

    if (isEmptyEmployeeId(user.employeeId)) return;

    const originalEmployeeId = String(user.employeeId);
    const normalizedEmployeeId = normalizeEmployeeId(originalEmployeeId);
    existingEmployeeIdsByUser.set(String(user._id), originalEmployeeId);
    usedEmployeeIds.add(normalizedEmployeeId);

    const match = normalizedEmployeeId.match(/^(ADMIN|MGR|EMP)(\d+)$/);
    if (!match) return;

    const role = ROLE_BY_PREFIX[match[1]];
    const sequenceNumber = Number(match[2]);
    if (role && Number.isInteger(sequenceNumber)) {
      roleCounters[role] = Math.max(roleCounters[role], sequenceNumber);
    }
  });

  const plannedAssignments = [];
  const skippedUnsupportedRoleUsers = [];

  users.forEach((user) => {
    if (!isEmptyEmployeeId(user.employeeId)) return;

    const role = normalizeRole(user.role);
    const prefix = ROLE_PREFIXES[role];

    if (!prefix) {
      skippedUnsupportedRoleUsers.push(user);
      return;
    }

    let employeeId;
    do {
      roleCounters[role] += 1;
      employeeId = formatEmployeeId(prefix, roleCounters[role]);
    } while (usedEmployeeIds.has(employeeId));

    usedEmployeeIds.add(employeeId);
    plannedAssignments.push({ user, employeeId });
  });

  let bulkResult = null;
  if (plannedAssignments.length > 0) {
    bulkResult = await User.bulkWrite(
      plannedAssignments.map(({ user, employeeId }) => ({
        updateOne: {
          filter: buildEmptyEmployeeIdFilter(user._id),
          update: { $set: { employeeId } },
        },
      })),
      { ordered: true }
    );
  }

  const totalUsersUpdated = getBulkCount(bulkResult, "modifiedCount");
  const skippedUsers = totalUsersScanned - totalUsersUpdated;

  const updatedUsers = await User.find({})
    .select("_id email password role employeeId isActive")
    .sort({ createdAt: 1, _id: 1 })
    .lean();
  const updatedUsersById = new Map(updatedUsers.map((user) => [String(user._id), user]));

  const existingIdsPreserved = Array.from(existingEmployeeIdsByUser.entries()).every(([userId, employeeId]) => {
    const updatedUser = updatedUsersById.get(userId);
    return updatedUser && String(updatedUser.employeeId) === employeeId;
  });

  const plannedUsersHaveEmployeeIds = plannedAssignments.every(({ user }) => {
    const updatedUser = updatedUsersById.get(String(user._id));
    return updatedUser && !isEmptyEmployeeId(updatedUser.employeeId);
  });

  const generatedEmployeeIds = plannedAssignments.map(({ employeeId }) => employeeId);
  const generatedIdsUnique = new Set(generatedEmployeeIds).size === generatedEmployeeIds.length;
  const duplicateEmployeeIds = findDuplicateEmployeeIds(updatedUsers);
  const authUnchanged = Array.from(authSnapshotByUser.entries()).every(([userId, snapshot]) => {
    const updatedUser = updatedUsersById.get(userId);
    return updatedUser && snapshotsMatch(snapshot, updatedUser);
  });

  console.log("");
  console.log("HeroTrack Pro employee ID migration summary");
  console.log(`Total users scanned: ${totalUsersScanned}`);
  console.log(`Total users updated: ${totalUsersUpdated}`);
  console.log(`Skipped users: ${skippedUsers}`);

  if (skippedUnsupportedRoleUsers.length > 0) {
    console.log(`Unsupported role skips: ${skippedUnsupportedRoleUsers.length}`);
  }

  console.log("");
  console.log("Verification");
  console.log(`Existing employee IDs preserved: ${existingIdsPreserved ? "PASS" : "FAIL"}`);
  console.log(`Old users receive IDs: ${plannedUsersHaveEmployeeIds ? "PASS" : "FAIL"}`);
  console.log(`No duplicate employee IDs generated: ${generatedIdsUnique ? "PASS" : "FAIL"}`);
  console.log(`Existing authentication unchanged: ${authUnchanged ? "PASS" : "FAIL"}`);

  if (duplicateEmployeeIds.length > 0) {
    console.log("");
    console.log(`Warning: duplicate employee IDs already exist in the database: ${duplicateEmployeeIds.join(", ")}`);
  }

  if (!existingIdsPreserved || !plannedUsersHaveEmployeeIds || !generatedIdsUnique || !authUnchanged) {
    throw new Error("Employee ID migration verification failed.");
  }
};

run()
  .catch((error) => {
    console.error("Employee ID migration failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
