const mongoose = require("mongoose");

const ApprovalRequestSchema = new mongoose.Schema(
  {
    requestCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    requestType: {
      type: String,
      enum: ["inventory_movement", "department_request"],
      default: "inventory_movement",
    },
    movement: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "InventoryMovement",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    items: [
      {
        part: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, min: 1 },
      },
    ],
    remarks: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedAt: {
      type: Date,
    },
    rejectionReason: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ApprovalRequest", ApprovalRequestSchema);
