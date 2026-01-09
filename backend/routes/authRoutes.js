// backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const { register, login, getProfile, updateProfile, deleteAccount } = require('../controllers/authController');const { protect } = require('../middleware/auth');

// 公開路由（不需登入）
router.post('/register', register);
router.post('/login', login);

// 受保護路由（需要登入）
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/delete', protect, deleteAccount); // <--- 新增這一行

module.exports = router;