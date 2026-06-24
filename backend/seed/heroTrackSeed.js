require("dotenv").config();
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const Department = require("../models/Departmentmodel");
const Product = require("../models/Productmodel");
const Supplier = require("../models/Suppliermodel");
const User = require("../models/Usermodel");
const Category = require("../models/ Categorymodel");
const DepartmentStock = require("../models/DepartmentStockmodel");
const Inventory = require("../models/Inventorymodel");
const InventoryMovement = require("../models/InventoryMovementmodel");
const ApprovalRequest = require("../models/ApprovalRequestmodel");
const Notification = require("../models/Notificationmodel");
const ActivityLog = require("../models/ActivityLogmodel");

const departments = [
  ["Warehouse", "WH"],
  ["Production", "PROD"],
  ["Assembly", "ASM"],
  ["Quality Control", "QC"],
  ["Maintenance", "MNT"],
  ["Purchase", "PUR"],
  ["Dispatch", "DSP"],
];

const categories = [
  "Engine Parts",
  "Transmission",
  "Electrical",
  "Body Panels",
  "Fasteners",
  "Brake System",
  "Suspension",
  "Consumables",
];

const manufacturers = ["Hero Genuine", "Bosch", "Minda", "Endurance", "Uno Minda", "SKF", "Lumax", "NGK"];
const partNames = [
  "Clutch Plate",
  "Brake Shoe",
  "Air Filter",
  "Oil Filter",
  "Spark Plug",
  "Chain Sprocket Kit",
  "Wiring Harness",
  "Head Lamp Assembly",
  "Fuel Pump",
  "Shock Absorber",
  "Piston Ring Set",
  "Handle Bar",
  "Brake Lever",
  "Side Panel",
  "Battery",
  "Bearing Kit",
  "Gasket Kit",
  "Gear Shaft",
  "Speed Sensor",
  "Starter Motor",
];

const pick = (items, index) => items[index % items.length];
const randomInt = (min, max, index) => min + ((index * 17 + 11) % (max - min + 1));
const code = (prefix, index) => `${prefix}-${String(index).padStart(4, "0")}`;

const verifySeedCounts = async () => {
  const verification = {
    departments: await Department.countDocuments(),
    categories: await Category.countDocuments(),
    suppliers: await Supplier.countDocuments(),
    users: await User.countDocuments(),
    spareParts: await Product.countDocuments(),
    inventoryLedgers: await Inventory.countDocuments(),
    departmentStocks: await DepartmentStock.countDocuments(),
    movements: await InventoryMovement.countDocuments(),
    approvals: await ApprovalRequest.countDocuments(),
    notifications: await Notification.countDocuments(),
  };

  const expectedMinimums = {
    departments: 7,
    categories: 8,
    suppliers: 20,
    users: 50,
    spareParts: 100,
    inventoryLedgers: 100,
    departmentStocks: 200,
    movements: 500,
    approvals: 70,
    notifications: 3,
  };

  const failed = Object.entries(expectedMinimums).filter(([key, minimum]) => verification[key] < minimum);
  if (failed.length > 0) {
    throw new Error(`Seed verification failed: ${failed.map(([key, minimum]) => `${key} < ${minimum}`).join(", ")}`);
  }

  console.log("HeroTrack Pro seed verification");
  Object.entries(verification).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });
};

const run = async () => {
  if (!process.env.MONGODB_URL) {
    throw new Error("MONGODB_URL is required to seed HeroTrack Pro data.");
  }

  await mongoose.connect(process.env.MONGODB_URL);
  console.log("Connected to MongoDB");

  await Promise.all([
    Department.deleteMany({}),
    Product.deleteMany({}),
    Supplier.deleteMany({}),
    User.deleteMany({}),
    Category.deleteMany({}),
    DepartmentStock.deleteMany({}),
    Inventory.deleteMany({}),
    InventoryMovement.deleteMany({}),
    ApprovalRequest.deleteMany({}),
    Notification.deleteMany({}),
    ActivityLog.deleteMany({}),
  ]);

  const createdDepartments = await Department.insertMany(
    departments.map(([name, codeValue]) => ({
      name,
      code: codeValue,
      description: `${name} department for Hero MotoCorp spare parts operations`,
      location: "Hero MotoCorp Plant - Dharuhera",
    }))
  );

  const createdCategories = await Category.insertMany(
    categories.map((name) => ({ name, description: `${name} spare parts category` }))
  );

  const suppliers = await Supplier.insertMany(
    Array.from({ length: 20 }, (_, index) => ({
      supplierCode: code("SUP", index + 1),
      name: `Hero Vendor ${index + 1}`,
      gstNumber: `06AABCH${1000 + index}Z${index % 9}`,
      contactPerson: `Vendor Contact ${index + 1}`,
      rating: 3 + ((index % 3) + 1) / 2,
      status: "active",
      contactInfo: {
        phone: `98${String(70000000 + index * 1379).slice(0, 8)}`,
        email: `vendor${index + 1}@herotrack.example`,
        address: `Industrial Area Phase ${index % 5}, Gurugram`,
      },
    }))
  );

  const password = await bcrypt.hash("Hero@12345", 10);
  const users = await User.insertMany(
    Array.from({ length: 50 }, (_, index) => {
      const role = index === 0 ? "admin" : index < 15 ? "manager" : "staff";
      return {
        staffId: code("HTP-STF", index + 1),
        name: `Hero User ${index + 1}`,
        email: `user${index + 1}@herotrack.example`,
        password,
        role,
        department: createdDepartments[index % createdDepartments.length]._id,
        designation: role === "admin" ? "System Administrator" : role.replace("_", " "),
        phone: `99${String(80000000 + index * 2027).slice(0, 8)}`,
        isActive: true,
        termsAccepted: true,
      };
    })
  );

  for (let index = 0; index < createdDepartments.length; index += 1) {
    createdDepartments[index].head = users[5 + index]?._id;
    await createdDepartments[index].save();
  }

  const parts = await Product.insertMany(
    Array.from({ length: 100 }, (_, index) => {
      const stock = randomInt(8, 260, index);
      const unitCost = randomInt(40, 8500, index);
      const partName = `${pick(partNames, index)} ${index + 1}`;
      return {
        partNumber: code("HMCL-SP", index + 1),
        partName,
        name: partName,
        Desciption: `${partName} for Hero MotoCorp plant spare-part tracking`,
        description: `${partName} for Hero MotoCorp plant spare-part tracking`,
        Category: createdCategories[index % createdCategories.length]._id,
        manufacturer: pick(manufacturers, index),
        Price: unitCost,
        unitCost,
        quantity: stock,
        currentStock: stock,
        reorderLevel: randomInt(10, 45, index),
        unitOfMeasure: index % 7 === 0 ? "set" : "pcs",
        supplier: suppliers[index % suppliers.length]._id,
        location: `Rack-${String.fromCharCode(65 + (index % 8))}${index % 20}`,
        status: "active",
      };
    })
  );

  await Inventory.insertMany(parts.map((part) => ({ product: part._id, quantity: part.currentStock })));

  const warehouse = createdDepartments.find((department) => department.code === "WH");
  const departmentStocks = parts.flatMap((part, index) => {
    const secondaryDepartment = createdDepartments[(index % (createdDepartments.length - 1)) + 1];
    return [
      {
      department: warehouse._id,
      part: part._id,
      quantity: Math.floor(part.currentStock * 0.65),
      },
      {
        department: secondaryDepartment._id,
        part: part._id,
        quantity: Math.floor(part.currentStock * 0.2),
      },
    ];
  });
  await DepartmentStock.insertMany(departmentStocks);

  const movementTypes = [
    "warehouse_to_production",
    "production_to_qc",
    "qc_to_assembly",
    "maintenance_request",
    "return",
    "transfer",
    "stock_in",
    "stock_out",
  ];

  const movements = await InventoryMovement.insertMany(
    Array.from({ length: 500 }, (_, index) => {
      const fromDepartment = createdDepartments[index % createdDepartments.length]._id;
      const toDepartment = createdDepartments[(index + 1) % createdDepartments.length]._id;
      const quantity = randomInt(1, 75, index);
      const approvalStatus = quantity > 50 ? (index % 4 === 0 ? "pending" : "approved") : "not_required";
      return {
        transactionCode: code("HTP-MOV", index + 1),
        part: parts[index % parts.length]._id,
        quantity,
        movementType: pick(movementTypes, index),
        fromDepartment,
        toDepartment,
        requestedBy: users[index % users.length]._id,
        approvedBy: approvalStatus === "approved" ? users[1]._id : undefined,
        approvalStatus,
        remarks: `Seeded movement ${index + 1}`,
        referenceNumber: code("REF", index + 1),
        transactionDate: new Date(Date.now() - index * 6 * 60 * 60 * 1000),
      };
    })
  );

  const approvalMovements = movements.filter((movement) => ["pending", "approved", "rejected"].includes(movement.approvalStatus)).slice(0, 60);
  await ApprovalRequest.insertMany(
    approvalMovements.map((movement, index) => ({
      requestCode: code("HTP-APR", index + 1),
      requestType: "inventory_movement",
      movement: movement._id,
      requestedBy: movement.requestedBy,
      department: movement.toDepartment,
      items: [{ part: movement.part, quantity: movement.quantity }],
      status: movement.approvalStatus === "approved" ? "approved" : index % 7 === 0 ? "rejected" : "pending",
      approvedBy: movement.approvalStatus === "pending" ? undefined : users[1]._id,
      approvedAt: movement.approvalStatus === "pending" ? undefined : new Date(Date.now() - index * 60 * 60 * 1000),
      rejectionReason: index % 7 === 0 ? "Seeded rejection for reporting coverage" : undefined,
    }))
  );

  await ApprovalRequest.insertMany(
    Array.from({ length: 20 }, (_, index) => ({
      requestCode: code("HTP-REQ", index + 1),
      requestType: "department_request",
      requestedBy: users[(index + 10) % users.length]._id,
      department: createdDepartments[(index % (createdDepartments.length - 1)) + 1]._id,
      items: [
        { part: parts[(index * 3) % parts.length]._id, quantity: randomInt(2, 35, index) },
        { part: parts[(index * 5 + 1) % parts.length]._id, quantity: randomInt(1, 20, index) },
      ],
      remarks: `Seeded department request ${index + 1}`,
      status: index % 5 === 0 ? "approved" : index % 6 === 0 ? "rejected" : "pending",
      approvedBy: index % 5 === 0 || index % 6 === 0 ? users[1]._id : undefined,
      approvedAt: index % 5 === 0 || index % 6 === 0 ? new Date(Date.now() - index * 90 * 60 * 1000) : undefined,
      rejectionReason: index % 6 === 0 ? "Seeded department request rejection" : undefined,
    }))
  );

  await Notification.insertMany([
    { name: "HeroTrack Pro seed data loaded successfully", type: "system" },
    { name: "Review pending high quantity movement approvals", type: "approval_pending" },
    { name: "Low stock watchlist generated from seeded spare parts", type: "low_stock" },
  ]);

  await verifySeedCounts();

  console.log("HeroTrack Pro seed complete");
  console.log("Admin login: user1@herotrack.example / Hero@12345");
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
