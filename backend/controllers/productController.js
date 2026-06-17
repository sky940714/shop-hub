// backend/controllers/productController.js
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');
const ProductVariant = require('../models/ProductVariant');
const ProductCategoryRelation = require('../models/ProductCategoryRelation');
const { promisePool } = require('../config/database');

/**
 * @desc    建立新商品（支援多圖）
 * @route   POST /api/products
 * @access  Private（需要登入，管理員）
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, variants, categoryIds, status, imageUrls } = req.body;

    // 驗證必填欄位
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '請填寫商品名稱'
      });
    }

    // 驗證規格
    if (!variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請至少新增一個商品規格'
      });
    }

    if (variants.length > 10) {
      return res.status(400).json({
        success: false,
        message: '商品規格最多 10 個'
      });
    }

    // 驗證每個規格
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.name || v.price === undefined || v.stock === undefined) {
        return res.status(400).json({
          success: false,
          message: `規格 ${i + 1} 缺少必填欄位（名稱、價格、庫存）`
        });
      }
      if (v.price < 0 || v.stock < 0) {
        return res.status(400).json({
          success: false,
          message: `規格 ${i + 1} 的價格和庫存不能為負數`
        });
      }
    }

    // 驗證分類
    if (!categoryIds || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請至少選擇一個分類'
      });
    }

    if (categoryIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: '最多只能選擇 5 個分類'
      });
    }

    // 建立商品（使用第一個規格的價格和庫存作為基礎價格）
    const productId = await Product.create({
      name,
      description,
      price: variants[0].price,  // 基礎價格
      stock: variants.reduce((sum, v) => sum + v.stock, 0),  // 總庫存
      category_id: categoryIds[0],  // 主分類（向後兼容）
      status: status || '草稿'
    });

    // 批次新增規格
    await ProductVariant.createMultiple(productId, variants);

    // 批次新增分類關聯
    await ProductCategoryRelation.createMultiple(productId, categoryIds);

    // 如果有圖片，批次新增
    if (imageUrls && imageUrls.length > 0) {
      await ProductImage.createMultiple(productId, imageUrls);
    }

    res.status(201).json({
      success: true,
      message: '商品建立成功',
      productId
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    取得所有商品（包含主圖）
 * @route   GET /api/products
 * @access  Public
 */
exports.getAllProducts = async (req, res, next) => {
  try {
    const products = await Product.getAll();

    res.json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    取得單一商品（包含所有圖片）
 * @route   GET /api/products/:id
 * @access  Public
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.getById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: '找不到此商品'
      });
    }

    // 取得商品規格
    const variants = await ProductVariant.getByProductId(req.params.id);

    // 取得商品分類
    const categories = await ProductCategoryRelation.getCategoriesByProductId(req.params.id);

    res.json({
      success: true,
      product: {
        ...product,
        variants,    // 規格列表
        categories   // 分類列表
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    取得上架中的商品（包含主圖）
 * @route   GET /api/products/published
 * @access  Public
 */
exports.getPublishedProducts = async (req, res, next) => {
  try {
    const products = await Product.getPublished();

    res.json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新商品（支援圖片更新）
 * @route   PUT /api/products/:id
 * @access  Private（管理員）
 */

exports.updateProduct = async (req, res, next) => {
  try {
    const { name, description, variants, categoryIds, status, imageUrls } = req.body;

    // 檢查商品是否存在
    const product = await Product.getById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '找不到此商品'
      });
    }

    // 驗證規格
    if (!variants || variants.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請至少新增一個商品規格'
      });
    }

    if (variants.length > 10) {
      return res.status(400).json({
        success: false,
        message: '商品規格最多 10 個'
      });
    }

    // 驗證每個規格
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      if (!v.name || v.price === undefined || v.stock === undefined) {
        return res.status(400).json({
          success: false,
          message: `規格 ${i + 1} 缺少必填欄位`
        });
      }
      if (v.price < 0 || v.stock < 0) {
        return res.status(400).json({
          success: false,
          message: `規格 ${i + 1} 的價格和庫存不能為負數`
        });
      }
    }

    // 驗證分類
    if (!categoryIds || categoryIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請至少選擇一個分類'
      });
    }

    if (categoryIds.length > 5) {
      return res.status(400).json({
        success: false,
        message: '最多只能選擇 5 個分類'
      });
    }

    // 更新商品基本資訊
    await Product.update(req.params.id, {
      name,
      description,
      price: variants[0].price,
      stock: variants.reduce((sum, v) => sum + v.stock, 0),
      category_id: categoryIds[0],
      status
    });

    // 更新規格（先刪除舊的，再新增）
    await ProductVariant.deleteByProductId(req.params.id);
    await ProductVariant.createMultiple(req.params.id, variants);

    // 更新分類關聯
    await ProductCategoryRelation.updateProductCategories(req.params.id, categoryIds);

    // 如果有新圖片，先刪除舊圖片再新增
    if (imageUrls && imageUrls.length > 0) {
      await ProductImage.deleteByProductId(req.params.id);
      await ProductImage.createMultiple(req.params.id, imageUrls);
    }

    res.json({
      success: true,
      message: '商品更新成功'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    刪除商品（同時刪除圖片）
 * @route   DELETE /api/products/:id
 * @access  Private（管理員）
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    // 檢查商品是否存在
    const product = await Product.getById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '找不到此商品'
      });
    }

    // 刪除商品圖片
    await ProductImage.deleteByProductId(req.params.id);

    // 刪除商品
    await Product.delete(req.params.id);

    res.json({
      success: true,
      message: '商品刪除成功'
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    依分類取得商品
 * @route   GET /api/products/category/:id
 * @access  Public
 */
exports.getProductsByCategory = async (req, res, next) => {
  try {
    const products = await Product.getByCategory(req.params.id);

    res.json({
      success: true,
      count: products.length,
      products
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    首頁一次性資料（所有分類 + 前 4 分類各 8 筆商品）
 * @route   GET /api/products/homepage
 * @access  Public
 */
exports.getHomepageData = async (req, res, next) => {
  try {
    // 兩個查詢並行，不互相等待
    const [categoriesResult, productsResult] = await Promise.all([
      // 1. 所有啟用分類（供導覽列用）
      promisePool.execute(`
        SELECT id, name, image_url, sort_order, parent_id, level, is_active
        FROM categories
        WHERE is_active = 1
        ORDER BY sort_order ASC
      `),
      // 2. 前 4 分類，每類最多 8 筆上架商品（單一 SQL，ROW_NUMBER 分頁）
      promisePool.execute(`
        SELECT ranked.*
        FROM (
          SELECT
            c.id           AS category_id,
            c.name         AS category_name,
            c.image_url    AS category_image,
            c.sort_order   AS category_sort,
            p.id, p.name, p.price, p.description,
            pi.image_url   AS main_image,
            ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.id DESC) AS rn
          FROM (
            SELECT id, name, image_url, sort_order
            FROM categories
            WHERE is_active = 1
            ORDER BY sort_order ASC
            LIMIT 4
          ) c
          JOIN product_category_relation pcr ON pcr.category_id = c.id
          JOIN products p ON p.id = pcr.product_id AND p.status = '上架'
          LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_main = 1
        ) ranked
        WHERE rn <= 8
        ORDER BY category_sort ASC, rn ASC
      `)
    ]);

    const categories = categoriesResult[0];
    const rows = productsResult[0];

    // 依分類 id 分組，保持順序
    const sectionMap = new Map();
    for (const row of rows) {
      if (!sectionMap.has(row.category_id)) {
        sectionMap.set(row.category_id, {
          category: {
            id: row.category_id,
            name: row.category_name,
            image_url: row.category_image,
            sort_order: row.category_sort,
            parent_id: null,
            level: 1,
            is_active: 1,
            productCount: 0
          },
          products: []
        });
      }
      const section = sectionMap.get(row.category_id);
      section.products.push({
        id: row.id,
        name: row.name,
        price: row.price,
        description: row.description,
        main_image: row.main_image
      });
      section.category.productCount = section.products.length;
    }

    res.json({
      success: true,
      categories,
      sections: Array.from(sectionMap.values())
    });

  } catch (error) {
    next(error);
  }
};