const InventoryMovement = require("../models/InventoryMovementmodel");
const DepartmentStock = require("../models/DepartmentStockmodel");
const ApprovalRequest = require("../models/ApprovalRequestmodel");
const logActivity = require("../libs/logger");
const {
  createInventoryMovement,
  syncAllInventory,
  approveMovement,
  rejectMovement,
} = require("../services/inventoryService");

const buildCode = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

exports.createMovement = async (req, res) => {
  try {
    const movement = await createInventoryMovement({
      ...req.body,
      requestedBy: req.user?._id || req.body.requestedBy,
      ipAddress: req.ip,
    });
    res.status(201).json({ success: true, movement });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Error creating inventory movement",
      available: error.available,
    });
  }
};

exports.getMovements = async (req, res) => {
  try {
    const filter = {};
    if (req.query.part) filter.part = req.query.part;
    if (req.query.department) filter.$or = [{ fromDepartment: req.query.department }, { toDepartment: req.query.department }];
    if (req.query.status) filter.approvalStatus = req.query.status;

    const movements = await InventoryMovement.find(filter)
      .populate("part fromDepartment toDepartment requestedBy approvedBy")
      .sort({ transactionDate: -1 })
      .limit(Number(req.query.limit || 200));
    res.status(200).json({ success: true, movements });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching movements", error: error.message });
  }
};

exports.getDepartmentStock = async (req, res) => {
  try {
    const filter = {};
    if (req.params.departmentId || req.query.department) {
      filter.department = req.params.departmentId || req.query.department;
    }
    if (req.query.part) filter.part = req.query.part;
    const stocks = await DepartmentStock.find(filter).populate("department part").sort({ updatedAt: -1 });
    res.status(200).json({ success: true, stocks });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching department inventory", error: error.message });
  }
};

exports.createDepartmentRequest = async (req, res) => {
  try {
    const { department, items, remarks } = req.body;
    if (!department || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Department and at least one requested item are required" });
    }

    const approval = await ApprovalRequest.create({
      requestCode: buildCode("HTP-REQ"),
      requestType: "department_request",
      requestedBy: req.user?._id || req.body.requestedBy,
      department,
      items: items.map((item) => ({ part: item.part, quantity: Number(item.quantity) })),
      status: "pending",
      remarks: remarks || "",
    });

    await logActivity({
      action: "REQUEST_CREATE",
      description: `Department request ${approval.requestCode} was created.`,
      module: "requests",
      entity: "approval",
      entityId: approval._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    req.app.get("io")?.emit("approval:pending", { approvalId: approval._id, requestCode: approval.requestCode });
    res.status(201).json({ success: true, approval });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating department request", error: error.message });
  }
};

exports.getRequests = async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.requestType = req.query.type;
    if (req.query.department) filter.department = req.query.department;

    const approvals = await ApprovalRequest.find(filter)
      .populate("movement requestedBy department items.part approvedBy")
      .sort({ createdAt: -1 })
      .limit(Number(req.query.limit || 200));
    res.status(200).json({ success: true, approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching requests", error: error.message });
  }
};

exports.getPendingApprovals = async (_req, res) => {
  try {
    const approvals = await ApprovalRequest.find({ status: "pending" })
      .populate("movement requestedBy department items.part approvedBy")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, approvals });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching approvals", error: error.message });
  }
};

exports.approveRequest = async (req, res) => {
  try {
    const result = await approveMovement(req.params.id, req.user?._id);
    await logActivity({
      action: "REQUEST_APPROVE",
      description: `Request ${result.approval.requestCode} was approved.`,
      module: "requests",
      entity: "approval",
      entityId: result.approval._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });
    req.app.get("io")?.emit("approval:processed", { approvalId: req.params.id, status: "approved" });
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.rejectRequest = async (req, res) => {
  try {
    const approval = await rejectMovement(req.params.id, req.user?._id, req.body.rejectionReason);
    await logActivity({
      action: "REQUEST_REJECT",
      description: `Request ${approval.requestCode} was rejected.`,
      module: "requests",
      entity: "approval",
      entityId: approval._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });
    req.app.get("io")?.emit("approval:processed", { approvalId: req.params.id, status: "rejected" });
    res.status(200).json({ success: true, approval });
  } catch (error) {
    res.status(error.statusCode || 500).json({ success: false, message: error.message });
  }
};

exports.syncInventoryLedger = async (_req, res) => {
  try {
    const results = await syncAllInventory();
    res.status(200).json({ success: true, synced: results.length, results });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error synchronizing inventory", error: error.message });
  }
};
