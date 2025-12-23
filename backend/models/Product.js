// backend/models/Product.js
const ProductImage = require('./ProductImage');
const { promisePool } = require('../config/database');

class Product {
  /**
   * 建立新商品
   */
  static async create({ name, description, price, stock, category_id, status = '草稿' }) {
    const [result] = await promisePool.execute(
      `INSERT INTO products (name, description, price, stock, category_id, status) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description, price, stock, category_id, status]
    );
    return result.insertId;
  }

  /**
   * 取得所有商品
   */
  // 修改後
static async getAll() {
  const [rows] = await promisePool.execute(`
    SELECT 
      p.*,
      c.name as category_name,
      pi.image_url as main_image,
      COUNT(pv.id) as variant_count
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
    LEFT JOIN product_variants pv ON p.id = pv.product_id
    GROUP BY p.id, c.name, pi.image_url
    ORDER BY p.id DESC
  `);
  return rows;
}

  /**
   * 取得單一商品
   */
  static async getById(id) {
  const [rows] = await promisePool.execute(
    'SELECT * FROM products WHERE id = ?',
    [id]
  );
  
  if (rows.length === 0) return null;

  const product = rows[0];
  
  // 取得商品的所有圖片
  product.images = await ProductImage.getByProductId(id);
  
  return product;
}

  /**
   * 取得上架中的商品
   */
  static async getPublished() {
  const [rows] = await promisePool.execute(`
    SELECT 
      p.*,
      c.name as category_name,
      pi.image_url as main_image
    FROM products p 
    LEFT JOIN categories c ON p.category_id = c.id 
    LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_main = 1
    WHERE p.status = '上架'
    ORDER BY p.id DESC
  `);
  return rows;
}

  /**
   * 更新商品
   */
  static async update(id, { name, description, price, stock, category_id, status }) {
    await promisePool.execute(
      `UPDATE products 
       SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, status = ?
       WHERE id = ?`,
      [name, description, price, stock, category_id, status, id]
    );
  }

  /**
   * 刪除商品
   */
  static async delete(id) {
    await promisePool.execute(
      'DELETE FROM products WHERE id = ?',
      [id]
    );
  }

  /**
   * 更新商品狀態
   */
  static async updateStatus(id, status) {
    await promisePool.execute(
      'UPDATE products SET status = ? WHERE id = ?',
      [status, id]
    );
  }
/**
   * 依分類取得商品
   */
  static async getByCategory(categoryId) {
    const [rows] = await promisePool.execute(`
      SELECT p.*, c.name as category_name 
      FROM products p 
      JOIN product_category_relation pcr ON p.id = pcr.product_id
      JOIN categories c ON pcr.category_id = c.id
      WHERE pcr.category_id = ? AND p.status = '上架'
      ORDER BY p.id DESC
    `, [categoryId]);
    return rows;
  }
}

module.exports = Product;