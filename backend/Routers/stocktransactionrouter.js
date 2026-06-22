const express = require('express');
const router = express.Router();
const {createStockTransaction,getAllStockTransactions,searchStocks,getStockTransactionsByProduct,getStockTransactionsBySupplier} = require('../controller/stocktransaction');
const { authmiddleware, authorizeRoles } = require("../middleware/Authmiddleware");

router.use(authmiddleware);
router.post('/createStockTransaction', authorizeRoles("admin", "manager"), createStockTransaction);
router.get('/getallStockTransaction', getAllStockTransactions);
router.get('/product/:productId',getStockTransactionsByProduct);
router.get('/supplier/:supplierId',getStockTransactionsBySupplier);
router.get('/searchstocks',searchStocks);


module.exports = router;
