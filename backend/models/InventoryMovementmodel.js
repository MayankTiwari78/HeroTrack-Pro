const mongoose = require("mongoose");

const InventoryMovementSchema = new mongoose.Schema(
  {
    transactionCode: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    movementType: {
      type: String,
      enum: [
        "warehouse_to_production",
        "production_to_qc",
        "qc_to_assembly",
        "maintenance_request",
        "return",
        "transfer",
        "stock_in",
        "stock_out",
        "adjustment",
      ],
      required: true,
    },
    fromDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    toDepartment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    approvalStatus: {
      type: String,
      enum: ["not_required", "pending", "approved", "rejected"],
      default: "not_required",
      index: true,
    },
    remarks: {
      type: String,
      default: "",
    },
    referenceNumber: {
      type: String,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InventoryMovement", InventoryMovementSchema);
