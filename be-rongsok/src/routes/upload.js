const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { protect } = require('../middlewares/auth');
const { uploadImage } = require('../controllers/upload');

// POST /api/v1/upload - Protected route, expects single file field named 'image'
router.post('/', protect, upload.single('image'), uploadImage);

module.exports = router;
