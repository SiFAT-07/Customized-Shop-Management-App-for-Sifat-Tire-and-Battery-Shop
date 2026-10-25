const express = require('express');
const router = express.Router();
const shopController = require('../controllers/shopController');

// Products & Stock
router.get('/products', shopController.getProducts);
router.post('/products', shopController.createProduct);
router.put('/products/:id', shopController.updateProduct);
router.delete('/products/:id', shopController.deleteProduct);
router.post('/stock-in', shopController.addStockPurchase);
router.delete('/stock-in/:id', shopController.deleteStockPurchase);

// Sales & Services (Create, Edit, Delete)
router.post('/sales-services', shopController.addSaleOrService);
router.put('/sales-services/:id', shopController.updateSaleOrService);
router.delete('/sales-services/:id', shopController.deleteSaleOrService);

// Expenses (Create, Edit, Delete)
router.post('/expenses', shopController.addExpense);
router.put('/expenses/:id', shopController.updateExpense);
router.delete('/expenses/:id', shopController.deleteExpense);
router.get('/expenses', shopController.getExpenses);
router.get('/reports/statement', shopController.getFinancialStatement);

// Reports (Daily & Monthly)
router.get('/reports/daily', shopController.getDailySummary);
router.get('/reports/monthly', shopController.getMonthlyReport);
router.get('/reports/analytics/summary', shopController.getAnalyticsSummary);

module.exports = router;