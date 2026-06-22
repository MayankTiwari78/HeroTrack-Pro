const express = require("express");
const router = express.Router();
const {createSupplier,searchSupplier,editSupplier,getAllSuppliers,deleteSupplier,getSupplierById} = require("../controller/suppliercontroller");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.post("/createsupplier", authorizeRoles("admin", "manager"), createSupplier);
router.get("/getallsupplier", getAllSuppliers);
router.get("/searchSupplier",searchSupplier)
router.get("/:supplierId",getSupplierById);
router.put("/updatesupplier/:supplierId", authorizeRoles("admin", "manager"), editSupplier);
router.delete("/:supplierId", authorizeRoles("admin", "manager"), deleteSupplier);

module.exports = router;
