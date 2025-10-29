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
  getProductsByCategory
} = require('../controllers/productController');
const { protect } = require('../middleware/auth');

// 公開路由（不需登入）
router.get('/', getAllProducts);
router.get('/published', getPublishedProducts);
router.get('/category/:id', getProductsByCategory);
router.get('/:id', getProductById);

// 受保護路由（需要登入，管理員）
router.post('/', protect, createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);

module.exports = router;