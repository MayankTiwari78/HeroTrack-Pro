const Product = require("../models/Productmodel");
const Inventory = require("../models/Inventorymodel");
const DepartmentStock = require("../models/DepartmentStockmodel");
const InventoryMovement = require("../models/InventoryMovementmodel");
const ApprovalRequest = require("../models/ApprovalRequestmodel");
const Notification = require("../models/Notificationmodel");
const logActivity = require("../libs/logger");

const APPROVAL_QUANTITY_LIMIT = Number(process.env.APPROVAL_QUANTITY_LIMIT || 50);

const buildCode = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

const syncInventory = async (part) => {
  const product = await Product.findById(part);
  if (!product) return null;

  const quantity = Number(product.currentStock ?? product.quantity ?? 0);
  product.currentStock = quantity;
  product.quantity = quantity;
  await product.save();

  const inventory = await Inventory.findOneAndUpdate(
    { product: product._id },
    { product: product._id, quantity, lastUpdated: new Date() },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (quantity <= Number(product.reorderLevel || 10)) {
    await Notification.create({
      name: `Low stock alert: ${product.partName || product.name} (${quantity} left)`,
      type: "low_stock",
      relatedEntity: "spare_part",
      relatedEntityId: product._id,
    });
  }

  return inventory;
};

const syncAllInventory = async () => {
  const products = await Product.find();
  const results = [];

  for (const product of products) {
    const inventory = await syncInventory(product._id);
    results.push({ part: product._id, inventory });
  }

  return results;
};

const adjustDepartmentStock = async (department, part, delta) => {
  if (!department || !delta) return null;

  const stock = await DepartmentStock.findOneAndUpdate(
    { department, part },
    { $inc: { quantity: delta }, $set: { lastUpdated: new Date() } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  if (stock.quantity < 0) {
    stock.quantity = 0;
    await stock.save();
  }

  return stock;
};

const applyMovement = async ({ part, quantity, movementType, fromDepartment, toDepartment }) => {
  const product = await Product.findById(part);
  if (!product) {
    const error = new Error("Spare part not found");
    error.statusCode = 404;
    throw error;
  }

  const qty = Number(quantity);
  const currentStock = Number(product.currentStock ?? product.quantity ?? 0);

  if (["stock_out", "warehouse_to_production", "maintenance_request", "transfer"].includes(movementType) && currentStock < qty) {
    const error = new Error("Insufficient stock for requested movement");
    error.statusCode = 400;
    error.available = currentStock;
    throw error;
  }

  if (["stock_in", "return", "adjustment"].includes(movementType)) {
    product.currentStock = currentStock + qty;
  } else {
    product.currentStock = currentStock - qty;
  }

  product.quantity = product.currentStock;
  await product.save();
  await syncInventory(product._id);

  if (fromDepartment) await adjustDepartmentStock(fromDepartment, product._id, -qty);
  if (toDepartment) await adjustDepartmentStock(toDepartment, product._id, qty);

  return product;
};

const createInventoryMovement = async ({
  part,
  quantity,
  movementType,
  fromDepartment,
  toDepartment,
  requestedBy,
  remarks,
  referenceNumber,
  forcePendingApproval = false,
}) => {
  const needsApproval = forcePendingApproval || Number(quantity) > APPROVAL_QUANTITY_LIMIT;
  const movement = await InventoryMovement.create({
    transactionCode: buildCode("HTP-MOV"),
    part,
    quantity,
    movementType,
    fromDepartment,
    toDepartment,
    requestedBy,
    remarks,
    referenceNumber,
    approvalStatus: needsApproval ? "pending" : "not_required",
  });

  if (needsApproval) {
    await ApprovalRequest.create({
      requestCode: buildCode("HTP-APR"),
      requestType: "inventory_movement",
      movement: movement._id,
      requestedBy,
      department: toDepartment || fromDepartment,
      items: [{ part, quantity }],
      status: "pending",
    });
    await Notification.create({
      name: `Approval required for ${quantity} spare parts movement`,
      type: "approval_pending",
      relatedEntity: "movement",
      relatedEntityId: movement._id,
    });
  } else {
    await applyMovement({ part, quantity, movementType, fromDepartment, toDepartment });
  }

  await logActivity({
    action: needsApproval ? "Inventory Movement Requested" : "Inventory Movement Completed",
    description: `${movementType} movement for quantity ${quantity}`,
    entity: "movement",
    entityId: movement._id,
    userId: requestedBy,
  });

  return movement;
};

const approveMovement = async (approvalId, approvedBy) => {
  const approval = await ApprovalRequest.findById(approvalId).populate("movement");
  if (!approval) {
    const error = new Error("Approval request not found");
    error.statusCode = 404;
    throw error;
  }

  if (approval.status !== "pending") {
    const error = new Error("Approval request is already processed");
    error.statusCode = 400;
    throw error;
  }

  const createdMovements = [];

  if (approval.movement) {
    const movement = approval.movement;
    await applyMovement({
      part: movement.part,
      quantity: movement.quantity,
      movementType: movement.movementType,
      fromDepartment: movement.fromDepartment,
      toDepartment: movement.toDepartment,
    });

    movement.approvalStatus = "approved";
    movement.approvedBy = approvedBy;
    await movement.save();
  } else {
    for (const item of approval.items) {
      await applyMovement({
        part: item.part,
        quantity: item.quantity,
        movementType: "maintenance_request",
        toDepartment: approval.department,
      });

      const movement = await InventoryMovement.create({
        transactionCode: buildCode("HTP-MOV"),
        part: item.part,
        quantity: item.quantity,
        movementType: "maintenance_request",
        toDepartment: approval.department,
        requestedBy: approval.requestedBy,
        approvedBy,
        approvalStatus: "approved",
        remarks: `Approved department request ${approval.requestCode}`,
        referenceNumber: approval.requestCode,
      });
      createdMovements.push(movement);
    }
  }

  approval.status = "approved";
  approval.approvedBy = approvedBy;
  approval.approvedAt = new Date();
  await approval.save();

  await Notification.create({
    name: `${approval.requestCode} approved`,
    type: "approval_approved",
    relatedEntity: "approval",
    relatedEntityId: approval._id,
  });

  return { approval, movements: createdMovements };
};

const rejectMovement = async (approvalId, approvedBy, rejectionReason) => {
  const approval = await ApprovalRequest.findById(approvalId).populate("movement");
  if (!approval) {
    const error = new Error("Approval request not found");
    error.statusCode = 404;
    throw error;
  }

  approval.status = "rejected";
  approval.approvedBy = approvedBy;
  approval.approvedAt = new Date();
  approval.rejectionReason = rejectionReason;
  await approval.save();

  if (approval.movement) {
    approval.movement.approvalStatus = "rejected";
    approval.movement.approvedBy = approvedBy;
    await approval.movement.save();
  }

  return approval;
};

module.exports = {
  APPROVAL_QUANTITY_LIMIT,
  syncInventory,
  syncAllInventory,
  applyMovement,
  createInventoryMovement,
  approveMovement,
  rejectMovement,
};
