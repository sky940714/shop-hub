// backend/models/ProductCategoryRelation.js
const db = require('../config/database');

class ProductCategoryRelation {
  /**
   * 批次新增商品與分類的關聯
   * @param {number} productId - 商品ID
   * @param {Array<number>} categoryIds - 分類ID陣列
   */
  static async createMultiple(productId, categoryIds) {
    if (!categoryIds || categoryIds.length === 0) {
      return;
    }

    // 去重
    const uniqueCategoryIds = [...new Set(categoryIds)];

    const values = uniqueCategoryIds.map(categoryId => [
      productId,
      categoryId
    ]);

    const sql = `
      INSERT INTO product_category_relation (product_id, category_id)
      VALUES ?
    `;

    const [result] = await db.query(sql, [values]);
    return result;
  }

  /**
   * 取得商品的所有分類
   * @param {number} productId - 商品ID
   */
  static async getCategoriesByProductId(productId) {
    const sql = `
      SELECT 
        c.id,
        c.name,
        c.parent_id,
        c.level
      FROM product_category_relation pcr
      INNER JOIN categories c ON pcr.category_id = c.id
      WHERE pcr.product_id = ?
      ORDER BY c.id ASC
    `;

    const [rows] = await db.query(sql, [productId]);
    return rows;
  }

  /**
   * 取得分類下的所有商品ID
   * @param {number} categoryId - 分類ID
   */
  static async getProductIdsByCategoryId(categoryId) {
    const sql = `
      SELECT product_id
      FROM product_category_relation
      WHERE category_id = ?
    `;

    const [rows] = await db.query(sql, [categoryId]);
    return rows.map(row => row.product_id);
  }

  /**
   * 刪除商品的所有分類關聯
   * @param {number} productId - 商品ID
   */
  static async deleteByProductId(productId) {
    const sql = 'DELETE FROM product_category_relation WHERE product_id = ?';
    const [result] = await db.query(sql, [productId]);
    return result;
  }

  /**
   * 刪除分類的所有商品關聯
   * @param {number} categoryId - 分類ID
   */
  static async deleteByCategoryId(categoryId) {
    const sql = 'DELETE FROM product_category_relation WHERE category_id = ?';
    const [result] = await db.query(sql, [categoryId]);
    return result;
  }

  /**
   * 刪除特定的商品-分類關聯
   * @param {number} productId - 商品ID
   * @param {number} categoryId - 分類ID
   */
  static async deleteRelation(productId, categoryId) {
    const sql = `
      DELETE FROM product_category_relation
      WHERE product_id = ? AND category_id = ?
    `;
    
    const [result] = await db.query(sql, [productId, categoryId]);
    return result;
  }

  /**
   * 更新商品的分類關聯（先刪除舊的，再新增新的）
   * @param {number} productId - 商品ID
   * @param {Array<number>} categoryIds - 新的分類ID陣列
   */
  static async updateProductCategories(productId, categoryIds) {
    // 開始事務
    const connection = await db.getConnection();
    
    try {
      await connection.beginTransaction();

      // 刪除舊的關聯
      await connection.query(
        'DELETE FROM product_category_relation WHERE product_id = ?',
        [productId]
      );

      // 新增新的關聯
      if (categoryIds && categoryIds.length > 0) {
        const uniqueCategoryIds = [...new Set(categoryIds)];
        const values = uniqueCategoryIds.map(categoryId => [productId, categoryId]);
        
        await connection.query(
          'INSERT INTO product_category_relation (product_id, category_id) VALUES ?',
          [values]
        );
      }

      await connection.commit();
      return true;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  /**
   * 檢查商品是否屬於某個分類
   * @param {number} productId - 商品ID
   * @param {number} categoryId - 分類ID
   */
  static async hasCategory(productId, categoryId) {
    const sql = `
      SELECT COUNT(*) as count
      FROM product_category_relation
      WHERE product_id = ? AND category_id = ?
    `;

    const [rows] = await db.query(sql, [productId, categoryId]);
    return rows[0].count > 0;
  }
}

module.exports = ProductCategoryRelation;