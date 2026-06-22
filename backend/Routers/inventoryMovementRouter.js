const express = require("express");
const router = express.Router();
const controller = require("../controller/inventoryMovementController");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.get("/", controller.getMovements);
router.post("/", controller.createMovement);
router.get("/requests", controller.getRequests);
router.post("/requests", controller.createDepartmentRequest);
router.post("/sync", authorizeRoles("admin", "manager"), controller.syncInventoryLedger);
router.get("/department-stock", controller.getDepartmentStock);
router.get("/department-stock/:departmentId", controller.getDepartmentStock);
router.get("/approvals/pending", authorizeRoles("admin", "manager"), controller.getPendingApprovals);
router.post("/approvals/:id/approve", authorizeRoles("admin", "manager"), controller.approveRequest);
router.post("/approvals/:id/reject", authorizeRoles("admin", "manager"), controller.rejectRequest);

module.exports = router;
