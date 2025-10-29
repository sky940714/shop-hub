// backend/models/ProductImage.js
const { promisePool } = require('../config/database');

class ProductImage {
  /**
   * 新增商品圖片
   */
  static async create({ product_id, image_url, sort_order = 0, is_main = 0 }) {
    const [result] = await promisePool.execute(
      `INSERT INTO product_images (product_id, image_url, sort_order, is_main) 
       VALUES (?, ?, ?, ?)`,
      [product_id, image_url, sort_order, is_main]
    );
    return result.insertId;
  }

  /**
   * 取得商品的所有圖片
   */
  static async getByProductId(product_id) {
    const [rows] = await promisePool.execute(
      `SELECT * FROM product_images 
       WHERE product_id = ? 
       ORDER BY is_main DESC, sort_order ASC`,
      [product_id]
    );
    return rows;
  }

  /**
   * 取得商品主圖
   */
  static async getMainImage(product_id) {
    const [rows] = await promisePool.execute(
      `SELECT * FROM product_images 
       WHERE product_id = ? AND is_main = 1 
       LIMIT 1`,
      [product_id]
    );
    return rows[0];
  }

  /**
   * 設定主圖
   */
  static async setMainImage(product_id, image_id) {
    // 先把該商品所有圖片的 is_main 設為 0
    await promisePool.execute(
      `UPDATE product_images SET is_main = 0 WHERE product_id = ?`,
      [product_id]
    );

    // 再把指定圖片的 is_main 設為 1
    await promisePool.execute(
      `UPDATE product_images SET is_main = 1 WHERE id = ?`,
      [image_id]
    );
  }

  /**
   * 刪除圖片
   */
  static async delete(id) {
    await promisePool.execute(
      'DELETE FROM product_images WHERE id = ?',
      [id]
    );
  }

  /**
   * 刪除商品的所有圖片
   */
  static async deleteByProductId(product_id) {
    await promisePool.execute(
      'DELETE FROM product_images WHERE product_id = ?',
      [product_id]
    );
  }

  /**
   * 批次新增圖片
   */
  static async createMultiple(product_id, imageUrls) {
    if (!imageUrls || imageUrls.length === 0) return;

    const values = imageUrls.map((url, index) => [
      product_id,
      url,
      index, // sort_order
      index === 0 ? 1 : 0 // 第一張設為主圖
    ]);

    const placeholders = values.map(() => '(?, ?, ?, ?)').join(', ');
    const flatValues = values.flat();

    await promisePool.execute(
      `INSERT INTO product_images (product_id, image_url, sort_order, is_main) 
       VALUES ${placeholders}`,
      flatValues
    );
  }
}

module.exports = ProductImage;