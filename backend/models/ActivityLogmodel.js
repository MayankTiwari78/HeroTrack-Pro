const mongoose = require("mongoose");

const ActivityLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    module: {
      type: String,
      required: true,
      default: "system",
      trim: true,
      lowercase: true,
    },
    entity: {
      type: String,
      trim: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    ipAddress: {
      type: String,
      trim: true,
    },
    loginTime: { type: Date },
    logoutTime: { type: Date },
    duration: { type: Number, min: 0, default: 0 },
    status: {
      type: String,
      enum: ["success", "failure", "pending"],
      default: "success",
    },
    dedupeKey: { type: String, unique: true, sparse: true },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model("ActivityLog", ActivityLogSchema);
