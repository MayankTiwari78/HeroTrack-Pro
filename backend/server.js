const express = require("express");
const { MongoDBconfig } = require("./libs/mongoconfig");
const { Server } = require("socket.io");
const http = require("http");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const authrouter = require("./Routers/authRouther");
const productrouter = require("./Routers/ProductRouter");
const orderrouter = require("./Routers/orderRouter");
const categoryrouter = require("./Routers/categoryRouter");
const notificationrouter = require("./Routers/notificationRouters");
const activityrouter = require("./Routers/activityRouter");
const inventoryrouter = require("./Routers/inventoryRouter");
const salesrouter = require("./Routers/salesRouter");
const supplierrouter = require("./Routers/supplierrouter");
const stocktransactionrouter = require("./Routers/stocktransactionrouter");
const departmentRouter = require("./Routers/departmentRouter");
const sparePartRouter = require("./Routers/sparePartRouter");
const inventoryMovementRouter = require("./Routers/inventoryMovementRouter");
const analyticsRouter = require("./Routers/analyticsRouter");

const logActivity = require("./libs/logger");
const { sweepInactiveUsers } = require("./services/presenceService");

require("dotenv").config();

const PORT = process.env.PORT || 3003;

const defaultAllowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "https://hero-track-pro.vercel.app",
];

const allowedOrigins = [
  ...defaultAllowedOrigins,
  ...(process.env.CLIENT_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
].filter(
  (origin, index, origins) => origins.indexOf(origin) === index
);

const app = express();
const server = http.createServer(app);

// Socket.IO CORS
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

// Express CORS
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests without origin (Postman, mobile apps)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.warn(`CORS blocked for origin: ${origin}`);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

app.set("io", io);

// Health Check Route
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "hero-track-pro-api",
  });
});

// Logger socket setup
logActivity.setSocketServer(io);

// Presence sweep every minute
const presenceSweep = setInterval(() => {
  sweepInactiveUsers(io).catch((error) =>
    console.error("Presence sweep failed:", error.message)
  );
}, 60 * 1000);

presenceSweep.unref();

// Routes
app.use("/api/auth", authrouter);
app.use("/api/product", productrouter);
app.use("/api/order", orderrouter);
app.use("/api/category", categoryrouter);
app.use("/api/notification", notificationrouter);
app.use("/api/activitylogs", activityrouter);
app.use("/api/inventory", inventoryrouter);
app.use("/api/sales", salesrouter);
app.use("/api/supplier", supplierrouter);
app.use("/api/stocktransaction", stocktransactionrouter);
app.use("/api/departments", departmentRouter);
app.use("/api/spare-parts", sparePartRouter);
app.use("/api/inventory-movements", inventoryMovementRouter);
app.use("/api/analytics", analyticsRouter);

// Start server
server.listen(PORT, () => {
  MongoDBconfig();
  console.info(`🚀 HeroTrack Pro Backend running on port ${PORT}`);
});

module.exports = { io, server };