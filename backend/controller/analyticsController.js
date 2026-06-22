const Product = require("../models/Productmodel");
const Department = require("../models/Departmentmodel");
const InventoryMovement = require("../models/InventoryMovementmodel");
const DepartmentStock = require("../models/DepartmentStockmodel");
const ApprovalRequest = require("../models/ApprovalRequestmodel");

exports.getSummary = async (_req, res) => {
  try {
    const parts = await Product.find();
    const movements = await InventoryMovement.countDocuments();
    const departments = await Department.countDocuments({ isActive: true });
    const pendingApprovals = await ApprovalRequest.countDocuments({ status: "pending" });
    const lowStockParts = parts.filter((part) => Number(part.currentStock ?? part.quantity) <= Number(part.reorderLevel || 10));
    const totalStockValue = parts.reduce((sum, part) => sum + Number(part.currentStock ?? part.quantity ?? 0) * Number(part.unitCost ?? part.Price ?? 0), 0);

    res.status(200).json({
      success: true,
      summary: {
        totalSpareParts: parts.length,
        totalStockValue,
        lowStockParts: lowStockParts.length,
        activeDepartments: departments,
        pendingApprovals,
        totalMovements: movements,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching analytics summary", error: error.message });
  }
};

exports.getDepartmentConsumption = async (_req, res) => {
  try {
    const data = await InventoryMovement.aggregate([
      { $match: { approvalStatus: { $in: ["not_required", "approved"] } } },
      { $group: { _id: "$toDepartment", totalQuantity: { $sum: "$quantity" }, movements: { $sum: 1 } } },
      { $sort: { totalQuantity: -1 } },
    ]);
    await Department.populate(data, { path: "_id", select: "name code" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching department consumption", error: error.message });
  }
};

exports.getMonthlyUsage = async (_req, res) => {
  try {
    const data = await InventoryMovement.aggregate([
      { $match: { approvalStatus: { $in: ["not_required", "approved"] } } },
      {
        $group: {
          _id: { year: { $year: "$transactionDate" }, month: { $month: "$transactionDate" } },
          totalQuantity: { $sum: "$quantity" },
          movements: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching monthly usage", error: error.message });
  }
};

exports.getInventoryTrends = async (_req, res) => {
  try {
    const data = await InventoryMovement.aggregate([
      { $match: { approvalStatus: { $in: ["not_required", "approved"] } } },
      {
        $group: {
          _id: {
            year: { $year: "$transactionDate" },
            month: { $month: "$transactionDate" },
            movementType: "$movementType",
          },
          quantity: { $sum: "$quantity" },
          movements: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.movementType": 1 } },
    ]);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching inventory trends", error: error.message });
  }
};

exports.getMostUsedParts = async (_req, res) => {
  try {
    const data = await InventoryMovement.aggregate([
      { $match: { movementType: { $ne: "stock_in" }, approvalStatus: { $in: ["not_required", "approved"] } } },
      { $group: { _id: "$part", totalQuantity: { $sum: "$quantity" }, movements: { $sum: 1 } } },
      { $sort: { totalQuantity: -1 } },
      { $limit: 10 },
    ]);
    await Product.populate(data, { path: "_id", select: "partNumber partName name" });
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching most used parts", error: error.message });
  }
};

exports.getDepartmentPerformance = async (_req, res) => {
  try {
    const stocks = await DepartmentStock.find().populate("department part");
    const byDepartment = stocks.reduce((acc, stock) => {
      const name = stock.department?.name || "Unassigned";
      acc[name] = acc[name] || { department: name, parts: 0, quantity: 0 };
      acc[name].parts += 1;
      acc[name].quantity += stock.quantity;
      return acc;
    }, {});
    res.status(200).json({ success: true, data: Object.values(byDepartment) });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching department performance", error: error.message });
  }
};

exports.getInventoryHealth = async (_req, res) => {
  try {
    const parts = await Product.find();
    const data = parts.reduce(
      (acc, part) => {
        const stock = Number(part.currentStock ?? part.quantity ?? 0);
        const reorderLevel = Number(part.reorderLevel || 10);
        const value = stock * Number(part.unitCost ?? part.Price ?? 0);
        acc.totalValue += value;
        if (stock === 0) acc.outOfStock += 1;
        else if (stock <= reorderLevel) acc.lowStock += 1;
        else acc.healthy += 1;
        return acc;
      },
      { healthy: 0, lowStock: 0, outOfStock: 0, totalValue: 0 }
    );

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching inventory health", error: error.message });
  }
};

exports.getApprovalMetrics = async (_req, res) => {
  try {
    const data = await ApprovalRequest.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          latest: { $max: "$updatedAt" },
        },
      },
      { $sort: { count: -1 } },
    ]);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching approval metrics", error: error.message });
  }
};

exports.getMovementFlow = async (_req, res) => {
  try {
    const data = await InventoryMovement.aggregate([
      { $match: { approvalStatus: { $in: ["not_required", "approved"] } } },
      {
        $group: {
          _id: { from: "$fromDepartment", to: "$toDepartment", type: "$movementType" },
          quantity: { $sum: "$quantity" },
          movements: { $sum: 1 },
        },
      },
      { $sort: { quantity: -1 } },
      { $limit: 25 },
    ]);
    await Department.populate(data, [{ path: "_id.from", select: "name code" }, { path: "_id.to", select: "name code" }]);
    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching movement flow", error: error.message });
  }
};

exports.getLowStockMonitoring = async (_req, res) => {
  try {
    const allParts = await Product.find().populate("Category supplier").sort({ currentStock: 1, quantity: 1 });
    const parts = allParts
      .filter((part) => Number(part.currentStock ?? part.quantity ?? 0) <= Number(part.reorderLevel || 10))
      .map((part) => {
        const stock = Number(part.currentStock ?? part.quantity ?? 0);
        const reorderLevel = Number(part.reorderLevel || 10);
        return {
          _id: part._id,
          partNumber: part.partNumber,
          partName: part.partName || part.name,
          currentStock: stock,
          reorderLevel,
          shortage: Math.max(0, reorderLevel - stock),
          supplier: part.supplier,
          category: part.Category,
        };
      });

    res.status(200).json({ success: true, parts, total: parts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching low stock monitoring", error: error.message });
  }
};
