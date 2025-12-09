// backend/models/ProductVariant.js
const db = require('../config/db');

class ProductVariant {
  /**
   * 批次新增商品規格
   * @param {number} productId - 商品ID
   * @param {Array} variants - 規格陣列 [{ name, price, stock }, ...]
   */
  static async createMultiple(productId, variants) {
    if (!variants || variants.length === 0) {
      return;
    }

    const values = variants.map(v => [
      productId,
      v.name,
      v.price,
      v.stock
    ]);

    const sql = `
      INSERT INTO product_variants (product_id, variant_name, price, stock)
      VALUES ?
    `;

    const [result] = await db.query(sql, [values]);
    return result;
  }

  /**
   * 取得商品的所有規格
   * @param {number} productId - 商品ID
   */
  static async getByProductId(productId) {
    const sql = `
      SELECT 
        id,
        product_id,
        variant_name,
        price,
        stock,
        created_at,
        updated_at
      FROM product_variants
      WHERE product_id = ?
      ORDER BY id ASC
    `;

    const [rows] = await db.query(sql, [productId]);
    return rows;
  }

  /**
   * 取得單一規格
   * @param {number} variantId - 規格ID
   */
  static async getById(variantId) {
    const sql = `
      SELECT 
        id,
        product_id,
        variant_name,
        price,
        stock,
        created_at,
        updated_at
      FROM product_variants
      WHERE id = ?
    `;

    const [rows] = await db.query(sql, [variantId]);
    return rows[0];
  }

  /**
   * 更新規格庫存
   * @param {number} variantId - 規格ID
   * @param {number} quantity - 數量（正數增加，負數減少）
   */
  static async updateStock(variantId, quantity) {
    const sql = `
      UPDATE product_variants
      SET stock = stock + ?
      WHERE id = ?
    `;

    const [result] = await db.query(sql, [quantity, variantId]);
    return result;
  }

  /**
   * 刪除商品的所有規格
   * @param {number} productId - 商品ID
   */
  static async deleteByProductId(productId) {
    const sql = 'DELETE FROM product_variants WHERE product_id = ?';
    const [result] = await db.query(sql, [productId]);
    return result;
  }

  /**
   * 刪除單一規格
   * @param {number} variantId - 規格ID
   */
  static async deleteById(variantId) {
    const sql = 'DELETE FROM product_variants WHERE id = ?';
    const [result] = await db.query(sql, [variantId]);
    return result;
  }

  /**
   * 檢查規格庫存是否足夠
   * @param {number} variantId - 規格ID
   * @param {number} quantity - 需要的數量
   */
  static async checkStock(variantId, quantity) {
    const sql = 'SELECT stock FROM product_variants WHERE id = ?';
    const [rows] = await db.query(sql, [variantId]);
    
    if (rows.length === 0) {
      return false;
    }
    
    return rows[0].stock >= quantity;
  }
}

module.exports = ProductVariant;