// backend/routes/pickup-stores.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { protect } = require('../middleware/auth');

// ========================================
// 1. 取得所有門市 (前台用 - 只取啟用的)
// GET /api/pickup-stores
// ========================================
router.get('/', async (req, res) => {
  try {
    const [stores] = await promisePool.query(`
      SELECT id, name, address, phone, business_hours
      FROM pickup_stores 
      WHERE is_active = 1
      ORDER BY id ASC
    `);

    res.json({
      success: true,
      stores: stores
    });
  } catch (error) {
    console.error('取得門市列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得門市列表失敗'
    });
  }
});

// ========================================
// 2. 取得所有門市 (後台用 - 包含停用的)
// GET /api/pickup-stores/admin/all
// ========================================
router.get('/admin/all', protect, async (req, res) => {
  try {
    const [stores] = await promisePool.query(`
      SELECT * FROM pickup_stores ORDER BY id ASC
    `);

    res.json({
      success: true,
      stores: stores
    });
  } catch (error) {
    console.error('取得門市列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '取得門市列表失敗'
    });
  }
});

// ========================================
// 3. 新增門市
// POST /api/pickup-stores/admin
// ========================================
router.post('/admin', protect, async (req, res) => {
  try {
    const { name, address, phone, business_hours, is_active } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '門市名稱和地址為必填'
      });
    }

    const [result] = await promisePool.query(`
      INSERT INTO pickup_stores (name, address, phone, business_hours, is_active)
      VALUES (?, ?, ?, ?, ?)
    `, [name, address, phone || null, business_hours || null, is_active !== false ? 1 : 0]);

    res.json({
      success: true,
      message: '門市新增成功',
      storeId: result.insertId
    });
  } catch (error) {
    console.error('新增門市失敗:', error);
    res.status(500).json({
      success: false,
      message: '新增門市失敗'
    });
  }
});

// ========================================
// 4. 更新門市
// PUT /api/pickup-stores/admin/:id
// ========================================
router.put('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, phone, business_hours, is_active } = req.body;

    if (!name || !address) {
      return res.status(400).json({
        success: false,
        message: '門市名稱和地址為必填'
      });
    }

    await promisePool.query(`
      UPDATE pickup_stores 
      SET name = ?, address = ?, phone = ?, business_hours = ?, is_active = ?
      WHERE id = ?
    `, [name, address, phone || null, business_hours || null, is_active ? 1 : 0, id]);

    res.json({
      success: true,
      message: '門市更新成功'
    });
  } catch (error) {
    console.error('更新門市失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新門市失敗'
    });
  }
});

// ========================================
// 5. 刪除門市
// DELETE /api/pickup-stores/admin/:id
// ========================================
router.delete('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    await promisePool.query(`
      DELETE FROM pickup_stores WHERE id = ?
    `, [id]);

    res.json({
      success: true,
      message: '門市刪除成功'
    });
  } catch (error) {
    console.error('刪除門市失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除門市失敗'
    });
  }
});

module.exports = router;