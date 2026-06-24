const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },
    staffId: { type: String, unique: true, sparse: true },
    employeeId: { type: String, trim: true, minlength: 3, maxlength: 20 },
    department: { type: mongoose.Schema.Types.ObjectId, ref: "Department" },
    designation: { type: String, trim: true },
    phone: { type: String, trim: true, match: /^[0-9]{10}$/ },
    phoneVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    lastSeen: { type: Date },
    isOnline: { type: Boolean, default: false },
    totalActiveTime: { type: Number, default: 0, min: 0 },
    currentSessionStart: { type: Date, default: null },
    termsAccepted: {
      type: Boolean,
      required: true,
      default: false,
    },
    ProfilePic: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", UserSchema);
