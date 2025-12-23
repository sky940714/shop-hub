// backend/routes/returns.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { protect } = require('../middleware/auth');

// ==========================================
// 1. 申請退貨 (會員前台)
// POST /api/returns/apply
// ==========================================
router.post('/apply', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const userId = req.user.id;
    const { orderNo, reason, bankCode, bankAccount } = req.body;

    // 檢查訂單
    const [orders] = await connection.query(`
      SELECT id, status FROM orders 
      WHERE order_no = ? AND user_id = ?
    `, [orderNo, userId]);

    if (orders.length === 0) {
      return res.status(404).json({ success: false, message: '找不到訂單' });
    }
    const order = orders[0];

    // 檢查狀態
    if (order.status !== 'completed') {
      return res.status(400).json({ success: false, message: '訂單必須為「已完成」狀態才能申請退貨' });
    }

    // 建立退貨單
    await connection.query(`
      INSERT INTO \`returns\` (order_no, user_id, reason, bank_code, bank_account, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `, [orderNo, userId, reason, bankCode, bankAccount]);

    // 更新訂單狀態
    await connection.query(`
      UPDATE orders SET status = 'return_requested' WHERE id = ?
    `, [order.id]);

    await connection.commit();
    res.json({ success: true, message: '退貨申請已提交' });

  } catch (error) {
    await connection.rollback();
    console.error('退貨申請失敗:', error);
    res.status(500).json({ success: false, message: '退貨申請失敗' });
  } finally {
    connection.release();
  }
});

// ==========================================
// 2. 取得所有退貨申請 (管理員後台)
// GET /api/returns/admin/list
// ==========================================
router.get('/admin/list', protect, async (req, res) => {
  try {
    // TODO: 這裡應該要檢查是否為管理員 (req.user.isAdmin)
    
    // 撈取退貨單，並關聯訂單金額和會員名稱
    const [returns] = await promisePool.query(`
      SELECT 
        r.*, 
        o.total as order_total,
        m.name as user_name,
        m.email as user_email
      FROM \`returns\` r
      JOIN orders o ON r.order_no = o.order_no
      JOIN members m ON r.user_id = m.id
      ORDER BY r.created_at DESC
    `);

    res.json({ success: true, returns });
  } catch (error) {
    console.error('取得退貨列表失敗:', error);
    res.status(500).json({ success: false, message: '取得列表失敗' });
  }
});

// ==========================================
// 3. 更新退貨狀態 (管理員後台)
// PUT /api/returns/admin/:id/status
// ==========================================
router.put('/admin/:id/status', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  try {
    await connection.beginTransaction();

    const returnId = req.params.id;
    const { status } = req.body; // status: 'approved'(審核通過/請寄回), 'refunded'(已退款/完成), 'rejected'(拒絕)

    // 取得目前的退貨單資訊
    const [currentReturn] = await connection.query('SELECT order_no FROM `returns` WHERE id = ?', [returnId]);
    if (currentReturn.length === 0) {
      throw new Error('找不到退貨單');
    }
    const orderNo = currentReturn[0].order_no;

    // 1. 更新退貨單狀態
    await connection.query('UPDATE `returns` SET status = ? WHERE id = ?', [status, returnId]);

    // 2. 同步更新訂單狀態邏輯
    let orderStatus = '';
    if (status === 'refunded') {
      orderStatus = 'refunded'; // 訂單也標記為已退款 (記得資料庫 orders.status 也要支援這個狀態)
    } else if (status === 'rejected') {
      orderStatus = 'completed'; // 拒絕退貨，訂單恢復為已完成
    } 
    // approved 狀態時，訂單保持 return_requested 或可改成 return_processing

    if (orderStatus) {
      await connection.query('UPDATE orders SET status = ? WHERE order_no = ?', [orderStatus, orderNo]);
    }

    await connection.commit();
    res.json({ success: true, message: '狀態更新成功' });

  } catch (error) {
    await connection.rollback();
    console.error('更新狀態失敗:', error);
    res.status(500).json({ success: false, message: '更新狀態失敗' });
  } finally {
    connection.release();
  }
});

module.exports = router;