const Department = require("../models/Departmentmodel");

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating department", error: error.message });
  }
};

exports.getDepartments = async (_req, res) => {
  try {
    const departments = await Department.find().populate("head", "name email role").sort({ name: 1 });
    res.status(200).json({ success: true, departments });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching departments", error: error.message });
  }
};

exports.getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id).populate("head", "name email role");
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching department", error: error.message });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, department });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating department", error: error.message });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!department) return res.status(404).json({ success: false, message: "Department not found" });
    res.status(200).json({ success: true, message: "Department deactivated", department });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting department", error: error.message });
  }
};
