// backend/models/User.js
const { promisePool } = require('../config/database');
const bcrypt = require('bcryptjs');

class User {
  /**
   * 建立新會員
   */
  static async create({ name, email, password, phone }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await promisePool.execute(
      'INSERT INTO members (name, email, password, phone) VALUES (?, ?, ?, ?)',
      [name, email, hashedPassword, phone]
    );
    return result.insertId;
  }

  /**
   * 透過 email 查找會員
   */
  static async findByEmail(email) {
    const [rows] = await promisePool.execute(
      'SELECT * FROM members WHERE email = ?',
      [email]
    );
    return rows[0];
  }

  /**
   * 透過 ID 查找會員
   */
  static async findById(id) {
    const [rows] = await promisePool.execute(
      'SELECT id, name, email, phone, role FROM members WHERE id = ?',
      [id]
    );
    return rows[0];
  }

  /**
   * 驗證密碼
   */
  static async comparePassword(inputPassword, hashedPassword) {
    return await bcrypt.compare(inputPassword, hashedPassword);
  }

  /**
   * 更新會員資料
   */
  static async update(id, { name, email, phone }) {
    await promisePool.execute(
      'UPDATE members SET name = ?, email = ?, phone = ? WHERE id = ?',
      [name, email, phone, id]
    );
  }
  /**
   * 刪除會員 (包含清理關聯資料)
   */
  static async delete(id) {
    const connection = await promisePool.getConnection();
    try {
      // 1. 開啟交易模式
      await connection.beginTransaction();

      // 2. 刪除收藏清單 (Wishlist)
      await connection.query('DELETE FROM wishlists WHERE user_id = ?', [id]);

      // 3. 刪除購物車 (Carts & Cart Items)
      // 先刪除該使用者的購物車內的商品
      await connection.query(`
        DELETE FROM cart_items 
        WHERE cart_id IN (SELECT id FROM carts WHERE user_id = ?)
      `, [id]);
      // 再刪除購物車本身
      await connection.query('DELETE FROM carts WHERE user_id = ?', [id]);

      // 4. 刪除點數紀錄 (Point Transactions)
      await connection.query('DELETE FROM point_transactions WHERE member_id = ?', [id]);

      // 5. 最後：刪除會員本體
      // 如果該會員有「訂單 (orders)」，這裡會報錯 (Foreign Key Error)，這是正常的保護機制
      const [result] = await connection.query('DELETE FROM members WHERE id = ?', [id]);

      // 6. 提交交易
      await connection.commit();
      return result;

    } catch (error) {
      // 發生錯誤，回滾所有操作
      await connection.rollback();
      throw error; 
    } finally {
      // 釋放連線
      connection.release();
    }
  }
}



module.exports = User;