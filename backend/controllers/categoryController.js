// backend/controllers/categoryController.js
const { promisePool } = require('../config/database');

// ========================================
// 1. 取得所有分類（包含商品數量統計）
// GET /api/categories
// ========================================
exports.getAllCategories = async (req, res) => {
  try {
    const [categories] = await promisePool.query(`
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        c.level,
        c.is_active,
        c.created_at,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.is_active = 1
      GROUP BY c.id
      ORDER BY c.level ASC, c.name ASC
    `);

    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('取得分類列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得分類列表失敗'
    });
  }
};

// ========================================
// 2. 取得單一分類
// GET /api/categories/:id
// ========================================
exports.getCategoryById = async (req, res) => {
  try {
    const { id } = req.params;

    const [categories] = await promisePool.query(`
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        c.level,
        c.is_active,
        c.created_at,
        COUNT(p.id) as productCount
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id
      WHERE c.id = ?
      GROUP BY c.id
    `, [id]);

    if (categories.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該分類'
      });
    }

    res.json({
      success: true,
      category: categories[0]
    });
  } catch (error) {
    console.error('取得分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得分類失敗'
    });
  }
};

// ========================================
// 3. 新增分類
// POST /api/categories
// ========================================
exports.createCategory = async (req, res) => {
  try {
    const { name, parent_id = null, level = 1 } = req.body;

    // 驗證必填欄位
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '分類名稱不能為空'
      });
    }

    // 檢查分類名稱是否已存在
    const [existing] = await promisePool.query(
      'SELECT id FROM categories WHERE name = ?',
      [name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: '此分類名稱已存在'
      });
    }

    // 如果有父分類，驗證父分類是否存在
    if (parent_id) {
      const [parentCategory] = await promisePool.query(
        'SELECT id, level FROM categories WHERE id = ?',
        [parent_id]
      );

      if (parentCategory.length === 0) {
        return res.status(400).json({
          success: false,
          message: '父分類不存在'
        });
      }
    }

    // 新增分類
    const [result] = await promisePool.query(
      'INSERT INTO categories (name, parent_id, level) VALUES (?, ?, ?)',
      [name.trim(), parent_id, level]
    );

    res.status(201).json({
      success: true,
      message: '分類新增成功',
      categoryId: result.insertId
    });
  } catch (error) {
    console.error('新增分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '新增分類失敗'
    });
  }
};

// ========================================
// 4. 更新分類
// PUT /api/categories/:id
// ========================================
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id, level, is_active } = req.body;

    // 檢查分類是否存在
    const [existing] = await promisePool.query(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該分類'
      });
    }

    // 驗證分類名稱
    if (!name || name.trim() === '') {
      return res.status(400).json({
        success: false,
        message: '分類名稱不能為空'
      });
    }

    // 檢查新名稱是否與其他分類重複
    const [duplicate] = await promisePool.query(
      'SELECT id FROM categories WHERE name = ? AND id != ?',
      [name.trim(), id]
    );

    if (duplicate.length > 0) {
      return res.status(400).json({
        success: false,
        message: '此分類名稱已被使用'
      });
    }

    // 更新分類
    await promisePool.query(
      `UPDATE categories 
       SET name = ?, parent_id = ?, level = ?, is_active = ?
       WHERE id = ?`,
      [name.trim(), parent_id || null, level || 1, is_active !== undefined ? is_active : 1, id]
    );

    res.json({
      success: true,
      message: '分類更新成功'
    });
  } catch (error) {
    console.error('更新分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新分類失敗'
    });
  }
};

// ========================================
// 5. 刪除分類
// DELETE /api/categories/:id
// ========================================
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // 檢查分類是否存在
    const [existing] = await promisePool.query(
      'SELECT id FROM categories WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到該分類'
      });
    }

    // 檢查是否有商品使用此分類
    const [products] = await promisePool.query(
      'SELECT COUNT(*) as count FROM products WHERE category_id = ?',
      [id]
    );

    if (products[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `此分類下還有 ${products[0].count} 個商品，無法刪除`
      });
    }

    // 檢查是否有子分類
    const [children] = await promisePool.query(
      'SELECT COUNT(*) as count FROM categories WHERE parent_id = ?',
      [id]
    );

    if (children[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: `此分類下還有 ${children[0].count} 個子分類，無法刪除`
      });
    }

    // 刪除分類
    await promisePool.query('DELETE FROM categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: '分類刪除成功'
    });
  } catch (error) {
    console.error('刪除分類失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除分類失敗'
    });
  }
};

// ========================================
// 6. 取得頂層分類（父分類列表）
// GET /api/categories/parent/list
// ========================================
exports.getParentCategories = async (req, res) => {
  try {
    const [categories] = await promisePool.query(`
      SELECT id, name, level
      FROM categories
      WHERE parent_id IS NULL AND is_active = 1
      ORDER BY name ASC
    `);

    res.json({
      success: true,
      categories: categories
    });
  } catch (error) {
    console.error('取得父分類列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得父分類列表失敗'
    });
  }
};