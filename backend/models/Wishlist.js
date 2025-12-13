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
    const sql = `
  SELECT 
    w.id as wishlist_id,
    p.id as product_id,
    p.name,
    p.price,
    (SELECT image_url FROM product_images WHERE product_id = p.id LIMIT 1) as image_url,
    p.stock,
    p.status,
    (SELECT COUNT(*) FROM product_variants WHERE product_id = p.id) as variant_count
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