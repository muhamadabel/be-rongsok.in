const express = require('express');
const router = express.Router();
const { search, getCategories, getCollectorById, getStats } = require('../controllers/discovery');

// Semua publik — landing page & pencarian bisa diakses tanpa login
router.get('/search', search);
router.get('/categories', getCategories);
router.get('/stats', getStats);
router.get('/collectors/:id', getCollectorById);

module.exports = router;
