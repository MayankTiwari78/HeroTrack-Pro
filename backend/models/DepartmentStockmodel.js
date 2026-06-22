const mongoose = require("mongoose");

const DepartmentStockSchema = new mongoose.Schema(
  {
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    part: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

DepartmentStockSchema.index({ department: 1, part: 1 }, { unique: true });

module.exports = mongoose.model("DepartmentStock", DepartmentStockSchema);
