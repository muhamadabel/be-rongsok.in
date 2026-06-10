const express = require('express');
const router = express.Router();
const upload = require('../middlewares/upload');
const { optionalAuth } = require('../middlewares/auth');
const { uploadImage } = require('../controllers/upload');

// POST /api/v1/upload - expects single file field named 'image'.
// Pakai optionalAuth (bukan protect) supaya upload foto KTP saat REGISTER —
// ketika user belum punya token — tetap bisa jalan. Tetap dibatasi multer:
// hanya image & maks 5MB (lihat middlewares/upload.js).
router.post('/', optionalAuth, upload.single('image'), uploadImage);

module.exports = router;
