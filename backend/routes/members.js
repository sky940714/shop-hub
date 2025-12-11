// backend/routes/members.js
const express = require('express');
const router = express.Router();
const { promisePool } = require('../config/database');
const { protect } = require('../middleware/auth');

// ========================================
// 1. 取得所有會員列表（後台）
// GET /api/members/admin/all
// ========================================
router.get('/admin/all', protect, async (req, res) => {
  try {
    const search = req.query.search || '';
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // 搜尋：姓名、Email、電話
    if (search) {
      whereClause += ' AND (m.name LIKE ? OR m.email LIKE ? OR m.phone LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    // 查詢會員列表，包含訂單統計
    const [members] = await promisePool.query(`
      SELECT 
        m.id,
        m.name,
        m.email,
        m.phone,
        m.points,
        m.date as join_date,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) as total_spent
      FROM members m
      LEFT JOIN orders o ON m.id = o.user_id
      ${whereClause}
      GROUP BY m.id, m.name, m.email, m.phone, m.points, m.date
      ORDER BY m.date DESC
    `, params);
    
    res.json({
      success: true,
      members: members
    });
    
  } catch (error) {
    console.error('查詢會員列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢會員列表失敗'
    });
  }
});

// ========================================
// 2. 取得會員詳情（後台）
// GET /api/members/admin/:id
// ========================================
router.get('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 查詢會員基本資料和統計
    const [members] = await promisePool.query(`
      SELECT 
        m.id,
        m.name,
        m.email,
        m.phone,
        m.points,
        m.date as join_date,
        COUNT(DISTINCT o.id) as total_orders,
        COALESCE(SUM(CASE WHEN o.status != 'cancelled' THEN o.total ELSE 0 END), 0) as total_spent
      FROM members m
      LEFT JOIN orders o ON m.id = o.user_id
      WHERE m.id = ?
      GROUP BY m.id, m.name, m.email, m.phone, m.points, m.date
    `, [id]);
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到會員'
      });
    }
    
    res.json({
      success: true,
      member: members[0]
    });
    
  } catch (error) {
    console.error('查詢會員詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢會員詳情失敗'
    });
  }
});

// ========================================
// 3. 取得會員訂單列表（後台）
// GET /api/members/admin/:id/orders
// ========================================
router.get('/admin/:id/orders', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [orders] = await promisePool.query(`
      SELECT 
        order_no,
        total,
        status,
        payment_status,
        created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [id]);
    
    res.json({
      success: true,
      orders: orders
    });
    
  } catch (error) {
    console.error('查詢會員訂單失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢會員訂單失敗'
    });
  }
});

// ========================================
// 4. 取得會員點數歷史（後台）
// GET /api/members/admin/:id/points-history
// ========================================
router.get('/admin/:id/points-history', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [history] = await promisePool.query(`
      SELECT 
        id,
        order_no,
        points,
        type,
        description,
        created_at
      FROM point_transactions
      WHERE member_id = ?
      ORDER BY created_at DESC
      LIMIT 50
    `, [id]);
    
    res.json({
      success: true,
      history: history
    });
    
  } catch (error) {
    console.error('查詢點數歷史失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢點數歷史失敗'
    });
  }
});

// ========================================
// 5. 調整會員點數（後台）
// POST /api/members/admin/:id/points
// ========================================
router.post('/admin/:id/points', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { points, description } = req.body;
    
    // 驗證點數
    if (!points || isNaN(points)) {
      return res.status(400).json({
        success: false,
        message: '請輸入有效的點數'
      });
    }
    
    const pointsNum = parseInt(points);
    
    // 如果是扣點，檢查餘額
    if (pointsNum < 0) {
      const [members] = await connection.query(
        'SELECT points FROM members WHERE id = ?',
        [id]
      );
      
      if (members.length === 0) {
        return res.status(404).json({
          success: false,
          message: '找不到會員'
        });
      }
      
      if (members[0].points + pointsNum < 0) {
        return res.status(400).json({
          success: false,
          message: '點數餘額不足'
        });
      }
    }
    
    // 更新會員點數
    await connection.query(`
      UPDATE members SET points = points + ? WHERE id = ?
    `, [pointsNum, id]);
    
    // 記錄點數交易
    await connection.query(`
      INSERT INTO point_transactions (member_id, points, type, description)
      VALUES (?, ?, 'adjust', ?)
    `, [id, pointsNum, description || `手動調整點數 ${pointsNum > 0 ? '+' : ''}${pointsNum}`]);
    
    await connection.commit();
    
    res.json({
      success: true,
      message: '點數調整成功'
    });
    
  } catch (error) {
    await connection.rollback();
    console.error('調整點數失敗:', error);
    res.status(500).json({
      success: false,
      message: '調整點數失敗'
    });
  } finally {
    connection.release();
  }
});

module.exports = router;