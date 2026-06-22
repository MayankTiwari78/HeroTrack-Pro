const express = require("express");
const router = express.Router();
const controller = require("../controller/sparePartController");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.get("/", controller.getSpareParts);
router.get("/low-stock", controller.getLowStockParts);
router.get("/:id", controller.getSparePartById);
router.post("/", authorizeRoles("admin", "manager"), controller.createSparePart);
router.put("/:id", authorizeRoles("admin", "manager"), controller.updateSparePart);
router.delete("/:id", authorizeRoles("admin"), controller.deleteSparePart);

module.exports = router;
