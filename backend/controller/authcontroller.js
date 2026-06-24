const User = require("../models/Usermodel");
const bcrypt = require("bcryptjs");
const generateToken = require("../libs/Tokengenerator");
const Cloundinary = require("../libs/Cloundinary");
const logActivity = require("../libs/logger");
const ActivityLog = require("../models/ActivityLogmodel");
const {
  getPresenceStatus,
  minutesBetween,
  roundMinutes,
  sweepInactiveUsers,
} = require("../services/presenceService");

const activeRoles = ["admin", "manager", "staff"];
const emailPattern = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;

const duplicateAccountResponse = {
  success: false,
  message: "Account already exists. Please login.",
};

const cleanOptionalString = (value) => {
  if (typeof value !== "string") return value || undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
};

const serializeAuthUser = (user, token) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  role: user.role,
  ProfilePic: user.ProfilePic,
  token,
});

const getUsersByRole = async (role, emptyMessage, res) => {
  const users = await User.find({ role, isActive: { $ne: false } })
    .populate("department")
    .select("-password")
    .sort({ name: 1 });

  if (users.length === 0) {
    return res.status(200).json({ message: emptyMessage });
  }

  return res.status(200).json(users);
};

const signup = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      staffId,
      department,
      designation,
      phone,
      termsAccepted,
    } = req.body;
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const trimmedEmail = typeof email === "string" ? email.trim() : "";

    if (!trimmedName) {
      return res.status(400).json({ success: false, message: "Name is required." });
    }

    if (termsAccepted !== true) {
      return res.status(400).json({
        success: false,
        message: "Terms and Conditions must be accepted.",
      });
    }

    if (!emailPattern.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    const duplicatedUser = await User.findOne({ email: trimmedEmail }).collation({
      locale: "en",
      strength: 2,
    });
    if (duplicatedUser) {
      return res.status(400).json(duplicateAccountResponse);
    }

    if (typeof password !== "string" || !passwordPattern.test(password)) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters and include an uppercase letter, a lowercase letter, a number, and a special character.",
      });
    }

    const requestedRole = role || "staff";
    if (!activeRoles.includes(requestedRole)) {
      return res.status(400).json({ success: false, message: "Invalid role. Use admin, manager, or staff." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();
    const newUser = new User({
      name: trimmedName,
      email: trimmedEmail,
      password: hashedPassword,
      ProfilePic: "",
      role: requestedRole,
      staffId: cleanOptionalString(staffId),
      department: department || undefined,
      designation: cleanOptionalString(designation),
      phone: cleanOptionalString(phone),
      termsAccepted: true,
      lastLogin: now,
      lastSeen: now,
      isOnline: true,
      currentSessionStart: now,
    });

    const savedUser = await newUser.save();
    const token = await generateToken(savedUser, res);

    await logActivity({
      action: "USER_CREATE",
      description: `User ${savedUser.name} created an account.`,
      module: "users",
      entity: "user",
      entityId: savedUser._id,
      userId: savedUser._id,
      ipAddress: req.ip,
      status: "success",
    });

    req.app.get("io")?.emit("presence:update", { userId: savedUser._id, status: "online" });

    return res.status(201).json({
      success: true,
      message: "Signup successful",
      savedUser: serializeAuthUser(savedUser, token),
    });
  } catch (error) {
    console.error("Error during signup:", error.message);
    if (error?.code === 11000 && (error?.keyPattern?.email || error?.keyValue?.email)) {
      return res.status(400).json(duplicateAccountResponse);
    }
    if (error?.code === 11000 && (error?.keyPattern?.staffId || error?.keyValue?.staffId)) {
      return res.status(400).json({ success: false, message: "Staff ID already exists." });
    }
    return res.status(400).json({ success: false, message: "Error during signup: " + error.message });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const trimmedEmail = typeof email === "string" ? email.trim() : "";
    const user = await User.findOne({ email: trimmedEmail }).collation({ locale: "en", strength: 2 });

    if (!user) {
      return res.status(400).json({ success: false, message: "No user found" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: "Account is inactive. Contact administrator." });
    }

    if (!activeRoles.includes(user.role)) {
      return res.status(403).json({ success: false, message: "403 Unauthorized: Role is no longer active." });
    }

    const token = await generateToken(user, res);
    const now = new Date();

    if (user.currentSessionStart && user.lastSeen) {
      user.totalActiveTime = roundMinutes(
        Number(user.totalActiveTime || 0) + minutesBetween(user.currentSessionStart, user.lastSeen)
      );
    }

    user.lastLogin = now;
    user.lastSeen = now;
    user.isOnline = true;
    user.currentSessionStart = now;
    await user.save();

    await logActivity({
      action: "LOGIN",
      description: `User ${user.name} logged in.`,
      module: "authentication",
      entity: "user",
      entityId: user._id,
      userId: user._id,
      ipAddress: req.ip,
      loginTime: now,
    });

    req.app.get("io")?.emit("presence:update", { userId: user._id, status: "online" });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      user: serializeAuthUser(user, token),
    });
  } catch (error) {
    return res.status(400).json({ success: false, message: "Error in login to the page" });
  }
};

const logout = async (req, res) => {
  try {
    const now = new Date();
    const user = await User.findById(req.user?._id);

    if (user) {
      const sessionStart = user.currentSessionStart;
      const duration = sessionStart ? roundMinutes(minutesBetween(sessionStart, now)) : 0;

      user.isOnline = false;
      user.lastSeen = now;
      user.totalActiveTime = roundMinutes(Number(user.totalActiveTime || 0) + duration);
      user.currentSessionStart = null;
      await user.save();

      await logActivity({
        action: "LOGOUT",
        description: `User ${user.name} logged out after ${duration.toFixed(2)} minutes.`,
        module: "authentication",
        entity: "user",
        entityId: user._id,
        userId: user._id,
        ipAddress: req.ip,
        loginTime: sessionStart || user.lastLogin,
        logoutTime: now,
        duration,
      });

      req.app.get("io")?.emit("presence:update", { userId: user._id, status: "offline" });
    }

    const isProduction = process.env.NODE_ENV === "production";
    res.cookie("Inventorymanagmentsystem", "", {
      maxAge: 0,
      httpOnly: true,
      sameSite: isProduction ? "None" : "Lax",
      secure: isProduction,
    });

    return res.status(200).json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "An error occurred during logout. Please try again.",
      error: error.message,
    });
  }
};

const updateProfile = async (req, res) => {
  try {
    const { ProfilePic } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User not authenticated" });
    }

    if (!ProfilePic) {
      return res.status(400).json({ success: false, message: "No profile picture provided" });
    }

    try {
      const uploadResponse = await Cloundinary.uploader.upload(ProfilePic, {
        folder: "profile_inventory_system",
        upload_preset: "upload",
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { ProfilePic: uploadResponse.secure_url },
        { new: true }
      ).select("-password");

      if (!updatedUser) {
        return res.status(404).json({ success: false, message: "User not found" });
      }

      await logActivity({
        action: "USER_UPDATE",
        description: `User ${updatedUser.name} updated their profile.`,
        module: "users",
        entity: "user",
        entityId: updatedUser._id,
        userId: updatedUser._id,
        ipAddress: req.ip,
      });

      return res.status(200).json({
        success: true,
        message: "Profile updated successfully",
        updatedUser,
      });
    } catch (cloudinaryError) {
      console.error("Cloudinary upload failed:", cloudinaryError);
      return res.status(500).json({
        success: false,
        message: "Image upload failed",
        error: cloudinaryError.message,
      });
    }
  } catch (error) {
    console.error("Error in update profile Controller", error.message);
    return res.status(500).json({ success: false, message: "Internal Server Error", error: error.message });
  }
};

const staffuser = async (_req, res) => {
  try {
    return getUsersByRole("staff", "There are no staff users available.", res);
  } catch (error) {
    console.log("Error in get staff Controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const manageruser = async (_req, res) => {
  try {
    return getUsersByRole("manager", "There are no manager users available.", res);
  } catch (error) {
    console.log("Error in get manager Controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const adminuser = async (_req, res) => {
  try {
    return getUsersByRole("admin", "There are no admin users available.", res);
  } catch (error) {
    console.log("Error in get admin Controller:", error.message);
    return res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

const removeuser = async (req, res) => {
  try {
    const { UserId } = req.params;

    if (!UserId) {
      return res.status(400).json({ success: false, message: "User ID is required" });
    }

    if (String(UserId) === String(req.user?._id)) {
      return res.status(400).json({ success: false, message: "You cannot delete your own active account." });
    }

    const deletedUser = await User.findByIdAndDelete(UserId);
    if (!deletedUser) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await logActivity({
      action: "USER_DELETE",
      description: `User ${deletedUser.name} (${deletedUser.email}) was deleted.`,
      module: "users",
      entity: "user",
      entityId: deletedUser._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    req.app.get("io")?.emit("presence:update", { userId: deletedUser._id, deleted: true });

    return res.status(200).json({
      success: true,
      message: "User deleted successfully",
      userId: deletedUser._id,
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};

const getUserActivityStatus = async (req, res) => {
  try {
    const now = new Date();
    await sweepInactiveUsers(req.app.get("io"), now);

    const users = await User.find({ isActive: { $ne: false } })
      .select("name email role ProfilePic lastLogin lastSeen isOnline totalActiveTime currentSessionStart")
      .sort({ name: 1 })
      .lean();

    const enrichedUsers = users.map((user) => {
      const status = getPresenceStatus(user, now);
      const liveSessionEnd = status === "online" ? now : user.lastSeen;
      const liveSessionMinutes = user.currentSessionStart
        ? minutesBetween(user.currentSessionStart, liveSessionEnd)
        : 0;

      return {
        ...user,
        status,
        totalActiveTime: roundMinutes(Number(user.totalActiveTime || 0) + liveSessionMinutes),
      };
    });

    const summary = enrichedUsers.reduce(
      (result, user) => {
        result.total += 1;
        result[user.status] += 1;
        if (activeRoles.includes(user.role)) {
          result.roles[user.role] += 1;
        }
        return result;
      },
      { total: 0, online: 0, idle: 0, offline: 0, roles: { admin: 0, manager: 0, staff: 0 } }
    );

    const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 6));
    const loginRows = await ActivityLog.aggregate([
      {
        $match: {
          action: { $in: ["LOGIN", "USER_LOGIN", "User Login"] },
          createdAt: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "UTC" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const loginMap = new Map(loginRows.map((row) => [row._id, row.count]));
    const dailyLogins = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(startDate.getTime() + index * 86400000);
      const key = date.toISOString().slice(0, 10);
      return { date: key, count: loginMap.get(key) || 0 };
    });

    return res.status(200).json({
      success: true,
      generatedAt: now.toISOString(),
      summary,
      dailyLogins,
      users: enrichedUsers,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Unable to load user activity status.",
      error: error.message,
    });
  }
};

module.exports = {
  adminuser,
  getUserActivityStatus,
  login,
  logout,
  manageruser,
  removeuser,
  signup,
  staffuser,
  updateProfile,
};
