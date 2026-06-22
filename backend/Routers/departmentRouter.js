const express = require("express");
const router = express.Router();
const controller = require("../controller/departmentController");
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.get("/", controller.getDepartments);
router.get("/:id", controller.getDepartmentById);
router.post("/", authorizeRoles("admin"), controller.createDepartment);
router.put("/:id", authorizeRoles("admin"), controller.updateDepartment);
router.delete("/:id", authorizeRoles("admin"), controller.deleteDepartment);

module.exports = router;
