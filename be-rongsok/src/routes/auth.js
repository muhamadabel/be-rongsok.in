const express = require('express');
const router = express.Router();
const { register, login, me, updateMe } = require('../controllers/auth');
const { protect } = require('../middlewares/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, me);
router.patch('/me', protect, updateMe);

module.exports = router;
