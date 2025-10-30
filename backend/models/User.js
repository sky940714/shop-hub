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
}

module.exports = User;