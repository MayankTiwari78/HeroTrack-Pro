const express = require("express");
const router = express.Router();
const {addOrUpdateInventory,getAllInventory,getInventoryByProduct,deleteInventory}= require("../controller/inventorycontroller");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.post("/inventory", authorizeRoles("admin", "manager"), addOrUpdateInventory);
router.get("/inventory", getAllInventory);
router.get("/inventory/:productId", getInventoryByProduct);
router.delete("/inventory/:productId", authorizeRoles("admin"), deleteInventory);

module.exports = router;
