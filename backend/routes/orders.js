// backend/routes/orders.js
const express = require('express');
const router = express.Router();
const { promisePool, query } = require('../config/database');
const { protect } = require('../middleware/auth');

// ========================================
// 1. 建立訂單 (前台)
// POST /api/orders/create
// ========================================
router.post('/create', protect, async (req, res) => {
  const connection = await promisePool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    const userId = req.user.id;
    const {
      shippingInfo,
      shippingMethod,
      shippingSubType,
      paymentMethod,
      invoiceType,
      companyName,
      taxId,
      subtotal,
      shippingFee,
      total,
      items
    } = req.body;

    // 產生訂單編號 (格式: ORD20251209001)
    const orderNo = await generateOrderNo(connection);

    // 插入訂單主表
    const [orderResult] = await connection.query(`
      INSERT INTO orders (
        order_no, user_id,
        receiver_name, receiver_phone, receiver_email, receiver_address,
        store_id, store_name, store_address,
        shipping_method, shipping_sub_type, shipping_fee,
        payment_method, payment_status,
        invoice_type, company_name, tax_id,
        subtotal, total, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      orderNo, userId,
      shippingInfo.name, shippingInfo.phone, shippingInfo.email, shippingInfo.address || null,
      shippingInfo.storeId || null, shippingInfo.storeName || null, shippingInfo.storeAddress || null,
      shippingMethod, shippingSubType || null, shippingFee,
      paymentMethod, 'unpaid',
      invoiceType, companyName || null, taxId || null,
      subtotal, total, 'pending'
    ]);

    const orderId = orderResult.insertId;

    // ✅ 修正：插入訂單明細（保存完整快照）
    for (const item of items) {
      await connection.query(`
        INSERT INTO order_items (
          order_id, product_id, variant_id,
          product_name, product_image, variant_name,
          price, quantity, subtotal
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        orderId,
        item.product_id,
        item.variant_id || null,         // ✅ 修正：規格 ID
        item.name,                        // 商品名稱快照
        item.image_url || null,           // ✅ 修正：商品圖片快照
        item.variant_name || null,        // ✅ 修正：規格名稱快照
        item.price,
        item.quantity,
        item.price * item.quantity
      ]);

      // ✅ 修正：區分商品庫存和規格庫存
      if (item.variant_id) {
        // 如果有規格，扣減規格庫存
        await connection.query(`
          UPDATE product_variants 
          SET stock = stock - ? 
          WHERE id = ?
        `, [item.quantity, item.variant_id]);
      } else {
        // 如果沒有規格，扣減商品總庫存
        await connection.query(`
          UPDATE products 
          SET stock = stock - ? 
          WHERE id = ?
        `, [item.quantity, item.product_id]);
      }
    }

    // 如果是從購物車來的,清空購物車
    if (items[0] && items[0].cart_item_id) {
      const [carts] = await connection.query(`
        SELECT id FROM carts WHERE user_id = ?
      `, [userId]);
      
      if (carts.length > 0) {
        const cartId = carts[0].id;
        await connection.query(`
          DELETE FROM cart_items WHERE cart_id = ?
        `, [cartId]);
      }
    }

    await connection.commit();

    // 如果是線上付款,這裡應該要導向綠界
    const paymentUrl = paymentMethod !== 'cod' 
      ? `http://45.32.24.240/api/ecpay/payment/${orderNo}` 
      : null;

    res.json({
      success: true,
      message: '訂單建立成功',
      orderNo: orderNo,
      paymentUrl: paymentUrl
    });

  } catch (error) {
    await connection.rollback();
    console.error('建立訂單失敗:', error);
    res.status(500).json({
      success: false,
      message: '建立訂單失敗',
      error: error.message
    });
  } finally {
    connection.release();
  }
});

// ========================================
// 2. 查詢單筆訂單 (前台)
// GET /api/orders/:orderNo
// ========================================
router.get('/:orderNo', protect, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const userId = req.user.id;

    // 查詢訂單基本資料
    const [orders] = await promisePool.query(`
      SELECT * FROM orders 
      WHERE order_no = ? AND user_id = ?
    `, [orderNo, userId]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到訂單'
      });
    }

    const order = orders[0];

    // 查詢訂單商品明細
    const [items] = await promisePool.query(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [order.id]);

    res.json({
      success: true,
      order: {
        ...order,
        items: items
      }
    });

  } catch (error) {
    console.error('查詢訂單失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢訂單失敗'
    });
  }
});

// ========================================
// 3. 查詢會員的所有訂單 (前台)
// GET /api/orders/user/list
// ========================================
router.get('/user/list', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 查詢該會員的所有訂單
    const [orders] = await promisePool.query(`
      SELECT 
        id, order_no, total, status, payment_status,
        shipping_method, payment_method, created_at
      FROM orders 
      WHERE user_id = ?
      ORDER BY created_at DESC
    `, [userId]);

    res.json({
      success: true,
      orders: orders
    });

  } catch (error) {
    console.error('查詢訂單列表失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢訂單列表失敗'
    });
  }
});

// ========================================
// 4. 取得所有訂單 (後台 - 帶分頁、搜尋、篩選)
// GET /api/orders/admin/all
// ========================================
router.get('/admin/all', protect, async (req, res) => {
  try {
    // TODO: 檢查是否為管理員

    // 分頁參數
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // 搜尋和篩選參數
    const search = req.query.search || '';
    const status = req.query.status || '';
    
    // 建立動態查詢條件
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    // 搜尋：訂單編號或客戶名稱
    if (search) {
      whereClause += ' AND (o.order_no LIKE ? OR o.receiver_name LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }
    
    // 篩選：訂單狀態
    if (status && status !== 'all') {
      whereClause += ' AND o.status = ?';
      params.push(status);
    }
    
    // 查詢總筆數
    const [countResult] = await promisePool.query(
      `SELECT COUNT(*) as total FROM orders o ${whereClause}`,
      params
    );
    const total = countResult[0].total;

    // 查詢訂單列表
    const [orders] = await promisePool.query(`
      SELECT 
        o.id, o.order_no, o.receiver_name, o.total, 
        o.status, o.payment_status, o.created_at
      FROM orders o
      ${whereClause}
      ORDER BY o.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    res.json({
      success: true,
      orders: orders,
      pagination: {
        page: page,
        limit: limit,
        total: total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('查詢訂單失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢訂單失敗'
    });
  }
});

// ========================================
// 5. 取得訂單詳情 (後台)
// GET /api/orders/admin/:orderNo
// ========================================
router.get('/admin/:orderNo', protect, async (req, res) => {
  try {
    const { orderNo } = req.params;

    // 查詢訂單基本資料
    const [orders] = await promisePool.query(`
      SELECT o.*, m.email as user_email, m.name as user_name
      FROM orders o
      LEFT JOIN members m ON o.user_id = m.id
      WHERE o.order_no = ?
    `, [orderNo]);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: '找不到訂單'
      });
    }

    const order = orders[0];

    // 查詢訂單商品明細
    const [items] = await promisePool.query(`
      SELECT * FROM order_items WHERE order_id = ?
    `, [order.id]);

    res.json({
      success: true,
      order: {
        ...order,
        items: items
      }
    });

  } catch (error) {
    console.error('查詢訂單詳情失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢訂單詳情失敗'
    });
  }
});

// ========================================
// 6. 更新訂單狀態 (後台)
// PUT /api/orders/admin/:orderNo/status
// ========================================
router.put('/admin/:orderNo/status', protect, async (req, res) => {
  try {
    const { orderNo } = req.params;
    const { status } = req.body;

    // 驗證狀態值
    const validStatuses = ['pending', 'paid', 'shipped', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: '無效的訂單狀態'
      });
    }

    // 更新訂單狀態
    await promisePool.query(`
      UPDATE orders SET status = ? WHERE order_no = ?
    `, [status, orderNo]);

    res.json({
      success: true,
      message: '訂單狀態更新成功'
    });

  } catch (error) {
    console.error('更新訂單狀態失敗:', error);
    res.status(500).json({
      success: false,
      message: '更新訂單狀態失敗'
    });
  }
});

// ========================================
// 7. 數據總覽統計 (後台)
// GET /api/orders/admin/dashboard/stats
// ========================================
router.get('/admin/dashboard/stats', protect, async (req, res) => {
  try {
    // 統計總商品數
    const [productCount] = await promisePool.query(`
      SELECT COUNT(*) as total FROM products
    `);

    // 統計總訂單數
    const [orderCount] = await promisePool.query(`
      SELECT COUNT(*) as total FROM orders
    `);

    // 統計總會員數
    const [memberCount] = await promisePool.query(`
      SELECT COUNT(*) as total FROM members
    `);

    // 統計總營業額 (排除已取消的訂單)
    const [revenue] = await promisePool.query(`
      SELECT SUM(total) as total FROM orders 
      WHERE status != 'cancelled'
    `);

    res.json({
      success: true,
      stats: {
        totalProducts: productCount[0].total,
        totalOrders: orderCount[0].total,
        totalMembers: memberCount[0].total,
        totalRevenue: revenue[0].total || 0
      }
    });

  } catch (error) {
    console.error('查詢統計資料失敗:', error);
    res.status(500).json({
      success: false,
      message: '查詢統計資料失敗'
    });
  }
});

// ========================================
// 輔助函數: 產生訂單編號
// ========================================
async function generateOrderNo(connection) {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
  
  // 查詢今天已有幾筆訂單
  const [result] = await connection.query(`
    SELECT COUNT(*) as count FROM orders 
    WHERE DATE(created_at) = CURDATE()
  `);
  
  const todayCount = result[0].count + 1;
  const orderNo = `ORD${dateStr}${String(todayCount).padStart(3, '0')}`;
  
  return orderNo;
}

module.exports = router;