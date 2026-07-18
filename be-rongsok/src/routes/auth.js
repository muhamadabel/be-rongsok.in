const express = require('express');
const router = express.Router();
const { register, login, me, updateMe, forgotPassword, resetPassword } = require('../controllers/auth');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);

module.exports = router;
