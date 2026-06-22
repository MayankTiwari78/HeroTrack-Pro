const express = require("express");
const router = express.Router();
const controller = require("../controller/analyticsController");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.use(authorizeRoles("admin", "manager"));
router.get("/summary", controller.getSummary);
router.get("/department-consumption", controller.getDepartmentConsumption);
router.get("/monthly-usage", controller.getMonthlyUsage);
router.get("/inventory-trends", controller.getInventoryTrends);
router.get("/most-used-parts", controller.getMostUsedParts);
router.get("/department-performance", controller.getDepartmentPerformance);
router.get("/inventory-health", controller.getInventoryHealth);
router.get("/approval-metrics", controller.getApprovalMetrics);
router.get("/movement-flow", controller.getMovementFlow);
router.get("/low-stock-monitoring", controller.getLowStockMonitoring);

module.exports = router;
