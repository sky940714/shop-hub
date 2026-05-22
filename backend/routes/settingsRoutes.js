// backend/routes/settingsRoutes.js
const express = require('express');
const router = express.Router();
const { promisePool: pool } = require('../config/database');
const { protect } = require('../middleware/auth');

// ==========================================
// 1. 取得運費設定（公開）
// ==========================================
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

// ==========================================
// 2. 更新運費設定（需管理員）
// ==========================================
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

// ========================================================================
// 🟢 這裡開始是新增的位置 (塞在 module.exports 之前)
// ========================================================================

// ==========================================
// 3. 取得退貨方式設定（公開，前台 App 與後台管理共用）
// GET /api/settings/return-methods
// ==========================================
router.get('/return-methods', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT setting_key, setting_value FROM settings WHERE setting_key LIKE 'return_%'"
    );
    
    // 將資料庫撈出的陣列結構轉換為前端好處理的 Object 格式
    const settings = {};
    rows.forEach(row => {
      settings[row.setting_key] = row.setting_value;
    });

    res.json({ success: true, settings });
  } catch (error) {
    console.error('取得退貨設定失敗:', error);
    res.status(500).json({ success: false, message: '取得退貨設定失敗' });
  }
});

// ==========================================
// 4. 更新退貨方式設定（需管理員驗證）
// PUT /api/settings/return-methods
// ==========================================
router.put('/return-methods', protect, async (req, res) => {
  try {
    const { 
      return_711_name, return_711_phone, return_711_instruction,
      return_fami_name, return_fami_phone, return_fami_instruction,
      return_hilife_name, return_hilife_phone, return_hilife_instruction,
      return_home_name, return_home_phone, return_home_instruction
    } = req.body;

    // 使用 Promise.all 同步更新 12 個系統 Key 值
    const updatePromises = [
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_711_name'", [return_711_name || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_711_phone'", [return_711_phone || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_711_instruction'", [return_711_instruction || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_fami_name'", [return_fami_name || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_fami_phone'", [return_fami_phone || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_fami_instruction'", [return_fami_instruction || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_hilife_name'", [return_hilife_name || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_hilife_phone'", [return_hilife_phone || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_hilife_instruction'", [return_hilife_instruction || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_home_name'", [return_home_name || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_home_phone'", [return_home_phone || '']),
      pool.query("UPDATE settings SET setting_value = ? WHERE setting_key = 'return_home_instruction'", [return_home_instruction || ''])
    ];

    await Promise.all(updatePromises);
    res.json({ success: true, message: '退貨方式設定已成功更新' });
  } catch (error) {
    console.error('更新退貨設定失敗:', error);
    res.status(500).json({ success: false, message: '更新退貨設定失敗' });
  }
});

// ==========================================
//  module.exports 保持在最底部
// ==========================================
module.exports = router;