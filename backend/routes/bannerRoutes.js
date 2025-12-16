const express = require('express');
const router = express.Router();
const pool = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// 取得所有啟用的輪播圖（前台用）
router.get('/', async (req, res) => {
  try {
    const [banners] = await pool.query(
      'SELECT * FROM hero_banners WHERE is_active = 1 ORDER BY sort_order ASC'
    );
    res.json({ success: true, banners });
  } catch (error) {
    console.error('取得輪播圖失敗:', error);
    res.status(500).json({ success: false, message: '取得輪播圖失敗' });
  }
});

// 取得所有輪播圖（後台用）
router.get('/admin/all', protect, async (req, res) => {
  try {
    const [banners] = await pool.query(
      'SELECT * FROM hero_banners ORDER BY sort_order ASC'
    );
    res.json({ success: true, banners });
  } catch (error) {
    console.error('取得輪播圖失敗:', error);
    res.status(500).json({ success: false, message: '取得輪播圖失敗' });
  }
});

// 新增輪播圖
router.post('/admin', protect, async (req, res) => {
  try {
    const { title, subtitle, image_url, link_url, sort_order, is_active } = req.body;
    
    if (!image_url) {
      return res.status(400).json({ success: false, message: '請上傳圖片' });
    }

    const [result] = await pool.query(
      'INSERT INTO hero_banners (title, subtitle, image_url, link_url, sort_order, is_active) VALUES (?, ?, ?, ?, ?, ?)',
      [title || null, subtitle || null, image_url, link_url || null, sort_order || 0, is_active !== false ? 1 : 0]
    );

    res.json({ success: true, message: '輪播圖新增成功', id: result.insertId });
  } catch (error) {
    console.error('新增輪播圖失敗:', error);
    res.status(500).json({ success: false, message: '新增輪播圖失敗' });
  }
});

// 更新輪播圖
router.put('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, subtitle, image_url, link_url, sort_order, is_active } = req.body;

    await pool.query(
      'UPDATE hero_banners SET title = ?, subtitle = ?, image_url = ?, link_url = ?, sort_order = ?, is_active = ? WHERE id = ?',
      [title || null, subtitle || null, image_url, link_url || null, sort_order || 0, is_active ? 1 : 0, id]
    );

    res.json({ success: true, message: '輪播圖更新成功' });
  } catch (error) {
    console.error('更新輪播圖失敗:', error);
    res.status(500).json({ success: false, message: '更新輪播圖失敗' });
  }
});

// 刪除輪播圖
router.delete('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM hero_banners WHERE id = ?', [id]);
    res.json({ success: true, message: '輪播圖已刪除' });
  } catch (error) {
    console.error('刪除輪播圖失敗:', error);
    res.status(500).json({ success: false, message: '刪除輪播圖失敗' });
  }
});

module.exports = router;