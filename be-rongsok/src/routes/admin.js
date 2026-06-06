const express = require('express');
const router = express.Router();
const {
  getStats,
  getOrders,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/admin');
const { protect, authorize } = require('../middlewares/auth');

// Semua route admin butuh login + role ADMIN
router.use(protect, authorize('ADMIN'));

router.get('/stats', getStats);
router.get('/orders', getOrders);
router.post('/categories', createCategory);
router.patch('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

module.exports = router;
