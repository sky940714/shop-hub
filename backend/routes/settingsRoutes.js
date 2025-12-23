const express = require('express');
const router = express.Router();
const { promisePool: pool } = require('../config/database');
const { protect } = require('../middleware/auth');

// 取得運費設定（公開）
router.get('/shipping-fee', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_value FROM settings WHERE setting_key = 'home_delivery_fee'"
    );
    const fee = rows.length > 0 ? parseInt(rows[0].setting_value) : 100;
    res.json({ success: true, fee });
  } catch (error) {
    res.status(500).json({ success: false, message: '取得運費失敗' });
  }
});

// 更新運費設定（需管理員）
router.put('/shipping-fee', protect, async (req, res) => {
  try {
    const { fee } = req.body;
    await pool.query(
      "UPDATE settings SET setting_value = ? WHERE setting_key = 'home_delivery_fee'",
      [fee.toString()]
    );
    res.json({ success: true, message: '運費已更新' });
  } catch (error) {
    res.status(500).json({ success: false, message: '更新失敗' });
  }
});

module.exports = router;