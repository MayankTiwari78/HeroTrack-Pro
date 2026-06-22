const express = require("express");
const { MongoDBconfig } = require('./libs/mongoconfig');
const { Server } = require("socket.io");
const http = require("http");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const authrouter = require('./Routers/authRouther');
const productrouter = require('./Routers/ProductRouter');
const orderrouter = require('./Routers/orderRouter');
const categoryrouter = require("./Routers/categoryRouter")
const notificationrouter = require("./Routers/notificationRouters");
const activityrouter = require("./Routers/activityRouter");
const inventoryrouter = require('./Routers/inventoryRouter');
const salesrouter = require('./Routers/salesRouter');
const supplierrouter = require('./Routers/supplierrouter');
const stocktransactionrouter = require('./Routers/stocktransactionrouter');
const departmentRouter = require("./Routers/departmentRouter");
const sparePartRouter = require("./Routers/sparePartRouter");
const inventoryMovementRouter = require("./Routers/inventoryMovementRouter");
const analyticsRouter = require("./Routers/analyticsRouter");


require("dotenv").config();
const PORT = process.env.PORT || 3003;
const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:3000,https://hero-track-pro.vercel.app")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

app.use(cors({
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));


app.use(express.json({limit: "10mb"}));
app.set("io", io);
app.use(cookieParser());
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", service: "hero-track-pro-api" });
});
app.use('/api/auth', authrouter);
app.use('/api/product', productrouter);
app.use('/api/order', orderrouter);
app.use('/api/category', categoryrouter);
app.use('/api/notification', notificationrouter);
app.use('/api/activitylogs', activityrouter(app)); 
app.use('/api/inventory', inventoryrouter);
app.use('/api/sales', salesrouter);
app.use('/api/supplier', supplierrouter);
app.use("/api/stocktransaction", stocktransactionrouter);
app.use("/api/departments", departmentRouter);
app.use("/api/spare-parts", sparePartRouter);
app.use("/api/inventory-movements", inventoryMovementRouter);
app.use("/api/analytics", analyticsRouter);




server.listen(PORT, () => {
  MongoDBconfig();
  console.info(`The server is running at port ${PORT}`);
});



module.exports = { io, server};
