import express from 'express';
import * as authController from '../controllers/authController.js';
import * as productController from '../controllers/productController.js';
import * as inventoryController from '../controllers/inventoryController.js';
import * as transactionController from '../controllers/transactionController.js';
import * as analyticsController from '../controllers/analyticsController.js';
import * as machineController from '../controllers/machineController.js';
import { authenticateToken, authorizeRoles } from '../middleware/authMiddleware.js';

const router = express.Router();

// Public / Auth Routes
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticateToken, authController.me);

// Product Routes (Public reads for Touchscreen UI, Protected mutations for Admin)
router.get('/products', productController.getProducts);
router.get('/products/:id', productController.getProductById);
router.post('/products', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), productController.createProduct);
router.put('/products/:id', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), productController.updateProduct);
router.delete('/products/:id', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), productController.deleteProduct);
router.post('/products/upload-image', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), productController.uploadImage);

// Category Routes
router.get('/categories', productController.getCategories);
router.post('/categories', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), productController.createCategory);

// Inventory Routes (Admin Protected)
router.get('/inventory', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), inventoryController.getInventory);
router.post('/inventory/adjust', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), inventoryController.adjustStock);
router.get('/inventory/history', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), inventoryController.getAdjustmentsHistory);

// Transaction & Dispense Routes
router.post('/transactions/dispense', transactionController.createAndDispenseTransaction);
router.get('/transactions', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), transactionController.getTransactions);
router.get('/transactions/:id', transactionController.getTransactionById);

// Analytics Routes (Admin Protected)
router.get('/analytics/sales', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), analyticsController.getSalesAnalytics);

// Machine Monitoring Routes
router.get('/machines', machineController.getMachines);
router.get('/machines/:id', machineController.getMachineById);
router.post('/machines/:id/heartbeat', machineController.heartbeat);
router.post('/machines/emergency-stop', machineController.emergencyStop);
router.post('/machines/simulation-mode', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), machineController.setSimulationMode);
router.get('/machines/alerts/all', authenticateToken, authorizeRoles('SHOP_OWNER', 'ADMIN'), machineController.getAlerts);

export default router;
