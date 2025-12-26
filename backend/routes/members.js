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
    
    let whereClause = 'WHERE m.is_deleted = 0';
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

// ========================================
// 6. 刪除會員（軟刪除）（後台）
// DELETE /api/members/admin/:id
// ========================================
router.delete('/admin/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 檢查會員是否存在
    const [members] = await promisePool.query(
      'SELECT id, name FROM members WHERE id = ? AND is_deleted = 0',
      [id]
    );
    
    if (members.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到會員'
      });
    }
    
    // 軟刪除：標記為已刪除
    await promisePool.query(
      'UPDATE members SET is_deleted = 1 WHERE id = ?',
      [id]
    );
    
    res.json({
      success: true,
      message: `會員「${members[0].name}」已刪除`
    });
    
  } catch (error) {
    console.error('刪除會員失敗:', error);
    res.status(500).json({
      success: false,
      message: '刪除會員失敗'
    });
  }
});

// ========================================
// 前台會員 API
// ========================================

// 6. 取得登入會員資料
// GET /api/members/profile
router.get('/profile', protect, async (req, res) => {
  try {
    const [members] = await promisePool.query(`
    SELECT id, name, email, phone, points, date as join_date, carrier_code
    FROM members WHERE id = ?
    `, [req.user.id]);

    if (members.length === 0) {
      return res.status(404).json({ success: false, message: '找不到會員' });
    }

    res.json({ success: true, member: members[0] });
  } catch (error) {
    console.error('取得會員資料失敗:', error);
    res.status(500).json({ success: false, message: '取得會員資料失敗' });
  }
});

// 7. 更新會員基本資料
// PUT /api/members/profile
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, phone } = req.body;

    await promisePool.query(`
      UPDATE members SET name = ?, phone = ? WHERE id = ?
    `, [name, phone, req.user.id]);

    res.json({ success: true, message: '資料更新成功' });
  } catch (error) {
    console.error('更新會員資料失敗:', error);
    res.status(500).json({ success: false, message: '更新會員資料失敗' });
  }
});

// 8. 取得會員訂單列表
// GET /api/members/orders
router.get('/orders', protect, async (req, res) => {
  try {
    const [orders] = await promisePool.query(`
      SELECT 
        id,
        order_no,
        total,
        status,
        payment_status,
        created_at
      FROM orders
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [req.user.id]);

    // 取得每筆訂單的商品
    for (let order of orders) {
      const [items] = await promisePool.query(`
        SELECT product_name, quantity, price
        FROM order_items WHERE order_id = ?
      `, [order.id]);
      order.items = items;
    }

    res.json({ success: true, orders });
  } catch (error) {
    console.error('取得訂單失敗:', error);
    res.status(500).json({ success: false, message: '取得訂單失敗' });
  }
});

// 9. 更新手機載具
// PUT /api/members/carrier
router.put('/carrier', protect, async (req, res) => {
  try {
    const { carrier_code } = req.body;

    // 驗證格式（手機載具以 / 開頭，共 8 碼）
    if (carrier_code && !/^\/[A-Z0-9]{7}$/.test(carrier_code)) {
      return res.status(400).json({ 
        success: false, 
        message: '載具格式錯誤，應為 /+7碼英數字' 
      });
    }

    await promisePool.query(`
      UPDATE members SET carrier_code = ? WHERE id = ?
    `, [carrier_code || null, req.user.id]);

    res.json({ success: true, message: '載具設定成功' });
  } catch (error) {
    console.error('更新載具失敗:', error);
    res.status(500).json({ success: false, message: '更新載具失敗' });
  }
});

// ========================================
// 收件地址管理 API
// ========================================

// 10. 取得會員所有收件地址
// GET /api/members/addresses
router.get('/addresses', protect, async (req, res) => {
  try {
    const [addresses] = await promisePool.query(`
      SELECT id, recipient_name, phone, zip_code, full_address, is_default, created_at
      FROM shipping_addresses
      WHERE user_id = ?
      ORDER BY is_default DESC, created_at DESC
    `, [req.user.id]);

    res.json({ success: true, addresses });
  } catch (error) {
    console.error('取得收件地址失敗:', error);
    res.status(500).json({ success: false, message: '取得收件地址失敗' });
  }
});

// 11. 新增收件地址
// POST /api/members/addresses
router.post('/addresses', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { recipient_name, phone, zip_code, full_address, is_default } = req.body;

    // 驗證必填欄位
    if (!recipient_name || !phone || !full_address) {
      return res.status(400).json({ success: false, message: '請填寫完整資訊' });
    }

    // 如果設為預設，先把其他地址的預設取消
    if (is_default) {
      await connection.query(
        'UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?',
        [req.user.id]
      );
    }

    // 新增地址
    const [result] = await connection.query(`
      INSERT INTO shipping_addresses (user_id, recipient_name, phone, zip_code, full_address, is_default)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [req.user.id, recipient_name, phone, zip_code || '', full_address, is_default ? 1 : 0]);

    await connection.commit();

    res.json({ success: true, message: '地址新增成功', addressId: result.insertId });
  } catch (error) {
    await connection.rollback();
    console.error('新增地址失敗:', error);
    res.status(500).json({ success: false, message: '新增地址失敗' });
  } finally {
    connection.release();
  }
});

// 12. 更新收件地址
// PUT /api/members/addresses/:id
router.put('/addresses/:id', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const { id } = req.params;
    const { recipient_name, phone, zip_code, full_address, is_default } = req.body;

    // 驗證地址是否屬於該會員
    const [existing] = await connection.query(
      'SELECT id FROM shipping_addresses WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: '找不到此地址' });
    }

    // 如果設為預設，先把其他地址的預設取消
    if (is_default) {
      await connection.query(
        'UPDATE shipping_addresses SET is_default = 0 WHERE user_id = ?',
        [req.user.id]
      );
    }

    // 更新地址
    await connection.query(`
      UPDATE shipping_addresses 
      SET recipient_name = ?, phone = ?, zip_code = ?, full_address = ?, is_default = ?
      WHERE id = ? AND user_id = ?
    `, [recipient_name, phone, zip_code || '', full_address, is_default ? 1 : 0, id, req.user.id]);

    await connection.commit();

    res.json({ success: true, message: '地址更新成功' });
  } catch (error) {
    await connection.rollback();
    console.error('更新地址失敗:', error);
    res.status(500).json({ success: false, message: '更新地址失敗' });
  } finally {
    connection.release();
  }
});

// 13. 刪除收件地址
// DELETE /api/members/addresses/:id
router.delete('/addresses/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;

    // 驗證並刪除
    const [result] = await promisePool.query(
      'DELETE FROM shipping_addresses WHERE id = ? AND user_id = ?',
      [id, req.user.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: '找不到此地址' });
    }

    res.json({ success: true, message: '地址刪除成功' });
  } catch (error) {
    console.error('刪除地址失敗:', error);
    res.status(500).json({ success: false, message: '刪除地址失敗' });
  }
});

// 14. 取得預設收件地址
// GET /api/members/addresses/default
router.get('/addresses/default', protect, async (req, res) => {
  try {
    const [addresses] = await promisePool.query(`
      SELECT id, recipient_name, phone, zip_code, full_address
      FROM shipping_addresses
      WHERE user_id = ? AND is_default = 1
      LIMIT 1
    `, [req.user.id]);

    res.json({ 
      success: true, 
      address: addresses.length > 0 ? addresses[0] : null 
    });
  } catch (error) {
    console.error('取得預設地址失敗:', error);
    res.status(500).json({ success: false, message: '取得預設地址失敗' });
  }
});

module.exports = router;