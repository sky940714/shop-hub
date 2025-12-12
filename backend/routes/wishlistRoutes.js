// backend/routes/wishlistRoutes.js
const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const authMiddleware = require('../middleware/auth'); // 確保你有這個中間件來解析 Token

// 所有路徑都需要登入驗證
router.use(authMiddleware);

router.get('/', wishlistController.getWishlist);
router.post('/add', wishlistController.addToWishlist);
router.delete('/:productId', wishlistController.removeFromWishlist);

module.exports = router;