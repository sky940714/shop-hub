// backend/models/Wishlist.js
const { promisePool } = require('../config/database');

class Wishlist {
  // 加入收藏
  static async add(userId, productId) {
    // 使用 IGNORE，如果已經收藏過就不會報錯，直接忽略
    const [result] = await promisePool.execute(
      'INSERT IGNORE INTO wishlists (user_id, product_id) VALUES (?, ?)',
      [userId, productId]
    );
    return result;
  }

  // 移除收藏
  static async remove(userId, productId) {
    const [result] = await promisePool.execute(
      'DELETE FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return result;
  }

  // 取得某人的收藏列表 (包含商品詳細資訊)
  static async getByUserId(userId) {
    // 假設你的商品圖片存在 products 表的 image_url 或是關聯表，這裡以 products 表為例
    // 請根據你的 products 資料表欄位微調 SQL
    const sql = `
      SELECT 
        w.id as wishlist_id,
        p.id as product_id,
        p.name,
        p.price,
        p.original_price, -- 如果你資料表沒有這個欄位，請移除這行
        p.image_url,      -- 確認你的圖片欄位名稱
        p.stock,          -- 用來判斷是否缺貨
        p.category_id
      FROM wishlists w
      JOIN products p ON w.product_id = p.id
      WHERE w.user_id = ?
      ORDER BY w.created_at DESC
    `;
    
    const [rows] = await promisePool.execute(sql, [userId]);
    return rows;
  }
  
  // 檢查是否已收藏 (用於商品頁面顯示愛心狀態)
  static async check(userId, productId) {
    const [rows] = await promisePool.execute(
      'SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?',
      [userId, productId]
    );
    return rows.length > 0;
  }
}

module.exports = Wishlist;