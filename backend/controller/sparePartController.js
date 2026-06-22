const Product = require("../models/Productmodel");
const { syncInventory } = require("../services/inventoryService");

const normalizePayload = (body) => ({
  ...body,
  name: body.partName || body.name,
  partName: body.partName || body.name,
  Desciption: body.description || body.Desciption || "No description provided",
  description: body.description || body.Desciption,
  Price: body.unitCost ?? body.Price,
  unitCost: body.unitCost ?? body.Price,
  quantity: body.currentStock ?? body.quantity ?? 0,
  currentStock: body.currentStock ?? body.quantity ?? 0,
});

exports.createSparePart = async (req, res) => {
  try {
    const part = await Product.create(normalizePayload(req.body));
    await syncInventory(part._id);
    res.status(201).json({ success: true, part });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating spare part", error: error.message });
  }
};

exports.getSpareParts = async (req, res) => {
  try {
    const { query, lowStock } = req.query;
    const filter = {};
    if (query) {
      filter.$or = [
        { partNumber: { $regex: query, $options: "i" } },
        { partName: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
        { manufacturer: { $regex: query, $options: "i" } },
      ];
    }

    let parts = await Product.find(filter).populate("Category supplier").sort({ partName: 1, name: 1 });
    if (lowStock === "true") {
      parts = parts.filter((part) => Number(part.currentStock ?? part.quantity) <= Number(part.reorderLevel || 10));
    }
    res.status(200).json({ success: true, parts, total: parts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching spare parts", error: error.message });
  }
};

exports.getSparePartById = async (req, res) => {
  try {
    const part = await Product.findById(req.params.id).populate("Category supplier");
    if (!part) return res.status(404).json({ success: false, message: "Spare part not found" });
    res.status(200).json({ success: true, part });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching spare part", error: error.message });
  }
};

exports.updateSparePart = async (req, res) => {
  try {
    const part = await Product.findByIdAndUpdate(req.params.id, normalizePayload(req.body), { new: true });
    if (!part) return res.status(404).json({ success: false, message: "Spare part not found" });
    await syncInventory(part._id);
    res.status(200).json({ success: true, part });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating spare part", error: error.message });
  }
};

exports.deleteSparePart = async (req, res) => {
  try {
    const part = await Product.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
    if (!part) return res.status(404).json({ success: false, message: "Spare part not found" });
    res.status(200).json({ success: true, message: "Spare part deactivated", part });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting spare part", error: error.message });
  }
};

exports.getLowStockParts = async (_req, res) => {
  try {
    const allParts = await Product.find().populate("Category supplier");
    const parts = allParts.filter((part) => Number(part.currentStock ?? part.quantity) <= Number(part.reorderLevel || 10));
    res.status(200).json({ success: true, parts, total: parts.length });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching low stock parts", error: error.message });
  }
};
