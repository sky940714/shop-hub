// backend/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');

// ✅ 修正重點：使用解構賦值 { protect } 來抓取 auth.js 裡面的 protect 函式
const { protect } = require('../middleware/auth');

// 確保 protect 是一個函式 (除錯用)
if (typeof protect !== 'function') {
    console.error('❌ 錯誤：無法載入 protect 中間件，請檢查 auth.js');
}

// 應用中間件 (這樣傳入的才是函式本身)
router.use(protect);

// 路由設定
router.get('/', wishlistController.getWishlist);
router.post('/', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;