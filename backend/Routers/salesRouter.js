const express = require("express");
const router = express.Router();
const {createSale,getAllSales,SearchSales,getSaleById,updateSale} = require("../controller/salescontroller");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.post("/createsales", authorizeRoles("admin", "manager"), createSale);
router.get("/getallsales", getAllSales);
router.get("/searchdata", SearchSales);
router.get("/:saleId", getSaleById);
router.put("/updatesales/:saleId",authorizeRoles("admin", "manager"), updateSale);



module.exports = router;
