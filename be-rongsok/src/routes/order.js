const express = require('express');
const router = express.Router();
const { createOrder, updateStatus, getOrderDetails, getOrders } = require('../controllers/order');
const { protect } = require('../middlewares/auth');

router.post('/', protect, createOrder);
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrderDetails);
router.patch('/:id', protect, updateStatus);

module.exports = router;
