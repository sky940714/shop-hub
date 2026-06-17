// backend/routes/productRoutes.js
const express = require('express');
const router = express.Router();
const {
  createProduct,
  getAllProducts,
  getProductById,
  getPublishedProducts,
  updateProduct,
  deleteProduct,
  getProductsByCategory,
  getHomepageData
} = require('../controllers/productController');

// 🔥 重要修改：同時引入 protect 和 admin
const { protect, admin } = require('../middleware/auth');

// ==========================================
// 公開路由（任何人都可以看）
// ==========================================
router.get('/', getAllProducts);
router.get('/homepage', getHomepageData);
router.get('/published', getPublishedProducts);
router.get('/category/:id', getProductsByCategory);
router.get('/:id', getProductById);

// ==========================================
// 管理員路由（需要登入 + 需要是 admin）
// ==========================================
// 🔥 重要修改：在 protect 後面加上 admin
router.post('/', protect, admin, createProduct);      // 新增商品
router.put('/:id', protect, admin, updateProduct);    // 修改商品
router.delete('/:id', protect, admin, deleteProduct); // 刪除商品

module.exports = router;