// backend/routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const { protect } = require('../middleware/auth');

// ========================================
// 公開路由（前台可用）
// ========================================

// 取得所有分類
router.get('/', categoryController.getAllCategories);

// 取得單一分類
router.get('/:id', categoryController.getCategoryById);

// ========================================
// 管理員路由（需要認證）
// ========================================

// 新增分類
router.post('/', protect, categoryController.createCategory);

// 更新分類
router.put('/:id', protect, categoryController.updateCategory);

// 刪除分類
router.delete('/:id', protect, categoryController.deleteCategory);

// 取得父分類列表
router.get('/parent/list', categoryController.getParentCategories);

module.exports = router;