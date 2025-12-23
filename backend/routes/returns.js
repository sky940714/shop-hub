// backend/routes/returns.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { protect } = require('../middleware/auth');

// ==========================================
// 申請退貨 (會員)
// POST /api/returns/apply
// ==========================================
router.post('/apply', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { orderNo, reason, bankCode, bankAccount } = req.body;

    // 1. 檢查訂單是否存在且屬於該會員
    const [orders] = await connection.query(`
      SELECT id, status, payment_method 
      FROM orders 
      WHERE order_no = ? AND user_id = ?
    `, [orderNo, userId]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '找不到此訂單' });
    }

    const order = orders[0];

    // 2. 檢查訂單狀態 (只有 "completed" 才能退貨)
    if (order.status !== 'completed') {
      return res.status(400).json({ success: false, message: '訂單必須為「已完成」狀態才能申請退貨' });
    }

    // 3. 建立退貨單
    await connection.query(`
      INSERT INTO returns (order_no, user_id, reason, bank_code, bank_account, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [orderNo, userId, reason, bankCode, bankAccount]);

    // 4. 更新訂單狀態為 "return_requested" (退貨申請中)
    await connection.query(`
      UPDATE orders SET status = 'return_requested' WHERE id = ?
    `, [order.id]);

    await connection.commit();

    res.json({
      success: true,
      message: '退貨申請已提交，請等待審核'
    });

  } catch (error) {
    await connection.rollback();
    console.error('退貨申請失敗:', error);
    res.status(500).json({
      success: false,
      message: '退貨申請失敗，請稍後再試'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;