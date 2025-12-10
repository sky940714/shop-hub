// backend/routes/cartRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// ========================================
// 輔助函式:獲取或建立使用者的購物車
// ========================================
async function getOrCreateCart(userId) {
  try {
    // ✅ 修改：加上解構
    const [carts] = await db.query(
      'SELECT id FROM carts WHERE user_id = ?',
      [userId]
    );

    if (carts.length > 0) {
      return carts[0].id;
    }

    // ✅ 修改：加上解構
    const [result] = await db.query(
      'INSERT INTO carts (user_id) VALUES (?)',
      [userId]
    );

    return result.insertId;

  } catch (error) {
    console.error('獲取或建立購物車失敗:', error);
    throw error;
  }
}

// ========================================
// 1. 獲取購物車
// GET /api/cart
// ========================================
router.get('/', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 獲取或建立購物車
    const cartId = await getOrCreateCart(userId);

    // ✅ 修改：查詢包含 variant 資訊
    const query = `
      SELECT 
        ci.id as cart_item_id,
        ci.quantity,
        ci.variant_id,
        p.id as product_id,
        p.name,
        p.status,
        COALESCE(pv.price, p.price) as price,
        COALESCE(pv.stock, p.stock) as stock,
        pv.variant_name,
        (SELECT image_url 
         FROM product_images 
         WHERE product_id = p.id 
         ORDER BY sort_order 
         LIMIT 1) as image_url
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      LEFT JOIN product_variants pv ON ci.variant_id = pv.id
      WHERE ci.cart_id = ?
      ORDER BY ci.id DESC
    `;

    const [items] = await db.query(query, [cartId]);

    // 計算總價
    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // 計算總數量
    const totalQuantity = items.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    res.json({
      success: true,
      cart: {
        id: cartId,
        items: items,
        total: total,
        itemCount: items.length,
        totalQuantity: totalQuantity
      }
    });

  } catch (error) {
    console.error('獲取購物車失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取購物車失敗' 
    });
  }
});

// ========================================
// 2. 加入購物車
// POST /api/cart/add
// Body: { product_id, quantity, variant_id }
// ========================================
router.post('/add', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id, quantity = 1, variant_id } = req.body;  // ✅ 新增：接收 variant_id

    console.log('📦 加入購物車請求:', { userId, product_id, quantity, variant_id });

    // 驗證輸入
    if (!product_id) {
      return res.status(400).json({ 
        success: false, 
        message: '缺少商品 ID' 
      });
    }

    if (quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: '數量必須大於 0' 
      });
    }

    // ✅ 修改：加上解構
    const [products] = await db.query(
      'SELECT id, name, price, stock, status FROM products WHERE id = ?',
      [product_id]
    );

    if (products.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '商品不存在' 
      });
    }

    const product = products[0];
    console.log('📦 商品資訊:', product);

    // 檢查商品狀態
    if (product.status !== '上架') {
      return res.status(400).json({ 
        success: false, 
        message: '商品已下架' 
      });
    }

    // ✅ 新增：如果有 variant_id，檢查規格
    let variantStock = product.stock;
    let variantPrice = product.price;
    let variantName = null;

    if (variant_id) {
      const [variants] = await db.query(
        'SELECT id, variant_name, price, stock FROM product_variants WHERE id = ? AND product_id = ?',
        [variant_id, product_id]
      );

      if (variants.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: '商品規格不存在' 
        });
      }

      const variant = variants[0];
      variantStock = variant.stock;
      variantPrice = variant.price;
      variantName = variant.variant_name;

      console.log('📦 規格資訊:', variant);
    }

    // 檢查庫存
    if (variantStock < quantity) {
      return res.status(400).json({ 
        success: false, 
        message: `庫存不足,目前庫存:${variantStock}` 
      });
    }

    // 獲取或建立購物車
    const cartId = await getOrCreateCart(userId);
    console.log('🛒 購物車 ID:', cartId);

    // ✅ 修改：檢查是否已有相同商品+規格的組合
    const [existingItems] = await db.query(
      'SELECT id, quantity FROM cart_items WHERE cart_id = ? AND product_id = ? AND (variant_id = ? OR (variant_id IS NULL AND ? IS NULL))',
      [cartId, product_id, variant_id, variant_id]
    );

    if (existingItems.length > 0) {
      // 更新數量
      const newQuantity = existingItems[0].quantity + quantity;

      if (newQuantity > variantStock) {
        return res.status(400).json({ 
          success: false, 
          message: `超過庫存數量,目前庫存:${variantStock}` 
        });
      }

      await db.query(
        'UPDATE cart_items SET quantity = ? WHERE id = ?',
        [newQuantity, existingItems[0].id]
      );

      console.log('✅ 更新購物車數量:', newQuantity);

      res.json({ 
        success: true, 
        message: `已更新購物車,目前數量:${newQuantity}`,
        action: 'updated',
        quantity: newQuantity
      });

    } else {
      // ✅ 修改：新增到購物車時包含 variant_id
      await db.query(
        'INSERT INTO cart_items (cart_id, product_id, quantity, variant_id) VALUES (?, ?, ?, ?)',
        [cartId, product_id, quantity, variant_id || null]
      );

      console.log('✅ 新增商品到購物車');

      res.json({ 
        success: true, 
        message: '已加入購物車',
        action: 'added',
        quantity: quantity
      });
    }

  } catch (error) {
    console.error('❌ 加入購物車失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '加入購物車失敗,請稍後再試' 
    });
  }
});

// ========================================
// 3. 更新購物車商品數量
// PUT /api/cart/update/:id
// Body: { quantity }
// ========================================
router.put('/update/:id', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItemId = req.params.id;
    const { quantity } = req.body;

    console.log('🔄 更新購物車請求:', { userId, cartItemId, quantity });

    if (!quantity || quantity < 1) {
      return res.status(400).json({ 
        success: false, 
        message: '數量必須大於 0' 
      });
    }

    // 獲取使用者的購物車 ID
    const cartId = await getOrCreateCart(userId);

    // ✅ 修改：查詢包含 variant 庫存
    const [cartItems] = await db.query(
      `SELECT 
         ci.*,
         p.status,
         p.name,
         COALESCE(pv.stock, p.stock) as stock,
         COALESCE(pv.price, p.price) as price
       FROM cart_items ci 
       JOIN products p ON ci.product_id = p.id 
       LEFT JOIN product_variants pv ON ci.variant_id = pv.id
       WHERE ci.id = ? AND ci.cart_id = ?`,
      [cartItemId, cartId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '購物車項目不存在' 
      });
    }

    const item = cartItems[0];
    console.log('📦 商品資訊:', item);

    // 檢查商品狀態
    if (item.status !== '上架') {
      return res.status(400).json({ 
        success: false, 
        message: '商品已下架' 
      });
    }

    // 檢查庫存
    if (quantity > item.stock) {
      return res.status(400).json({ 
        success: false, 
        message: `超過庫存數量,目前庫存:${item.stock}` 
      });
    }

    // ✅ 修改：加上解構
    await db.query(
      'UPDATE cart_items SET quantity = ? WHERE id = ?',
      [quantity, cartItemId]
    );

    console.log('✅ 數量已更新:', quantity);

    res.json({ 
      success: true, 
      message: '數量已更新' 
    });

  } catch (error) {
    console.error('❌ 更新數量失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '更新數量失敗' 
    });
  }
});

// ========================================
// 4. 刪除購物車商品
// DELETE /api/cart/remove/:id
// ========================================
router.delete('/remove/:id', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const cartItemId = req.params.id;

    console.log('🗑️ 刪除購物車項目:', { userId, cartItemId });

    // 獲取使用者的購物車 ID
    const cartId = await getOrCreateCart(userId);

    // ✅ 修改：加上解構
    const [cartItems] = await db.query(
      'SELECT * FROM cart_items WHERE id = ? AND cart_id = ?',
      [cartItemId, cartId]
    );

    if (cartItems.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: '購物車項目不存在' 
      });
    }

    // ✅ 修改：加上解構（雖然不需要返回值，但保持一致性）
    await db.query('DELETE FROM cart_items WHERE id = ?', [cartItemId]);

    console.log('✅ 已從購物車移除');

    res.json({ 
      success: true, 
      message: '已從購物車移除' 
    });

  } catch (error) {
    console.error('❌ 刪除失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除失敗' 
    });
  }
});

// ========================================
// 5. 清空購物車
// DELETE /api/cart/clear
// ========================================
router.delete('/clear', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    console.log('🧹 清空購物車:', { userId });

    // 獲取使用者的購物車 ID
    const cartId = await getOrCreateCart(userId);

    // ✅ 修改：加上解構
    await db.query('DELETE FROM cart_items WHERE cart_id = ?', [cartId]);

    console.log('✅ 購物車已清空');

    res.json({ 
      success: true, 
      message: '購物車已清空' 
    });

  } catch (error) {
    console.error('❌ 清空購物車失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '清空購物車失敗' 
    });
  }
});

// ========================================
// 6. 獲取購物車商品數量(用於導航欄顯示)
// GET /api/cart/count
// ========================================
router.get('/count', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    // 獲取或建立購物車
    const cartId = await getOrCreateCart(userId);

    // ✅ 修改：加上解構
    const [result] = await db.query(
      'SELECT COALESCE(SUM(quantity), 0) as count FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    const count = parseInt(result[0].count);

    res.json({ 
      success: true, 
      count: count 
    });

  } catch (error) {
    console.error('❌ 獲取購物車數量失敗:', error);
    res.status(500).json({ 
      success: false, 
      message: '獲取購物車數量失敗',
      count: 0
    });
  }
});

module.exports = router;