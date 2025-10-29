// backend/controllers/productController.js
const Product = require('../models/Product');
const ProductImage = require('../models/ProductImage');

/**
 * @desc    建立新商品（支援多圖）
 * @route   POST /api/products
 * @access  Private（需要登入，管理員）
 */
exports.createProduct = async (req, res, next) => {
  try {
    const { name, description, price, stock, category_id, status, imageUrls } = req.body;

    // 驗證必填欄位
    if (!name || !price || stock === undefined) {
      return res.status(400).json({
        success: false,
        message: '請填寫商品名稱、價格和庫存'
      });
    }

    // 驗證價格和庫存
    if (price < 0 || stock < 0) {
      return res.status(400).json({
        success: false,
        message: '價格和庫存不能為負數'
      });
    }

    // 建立商品
    const productId = await Product.create({
      name,
      description,
      price,
      stock,
      category_id,
      status: status || '草稿'
    });

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

    res.json({
      success: true,
      product
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
    const { name, description, price, stock, category_id, status, imageUrls } = req.body;

    // 檢查商品是否存在
    const product = await Product.getById(req.params.id);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '找不到此商品'
      });
    }

    // 更新商品基本資訊
    await Product.update(req.params.id, {
      name,
      description,
      price,
      stock,
      category_id,
      status
    });

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