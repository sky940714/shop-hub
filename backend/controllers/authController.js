// backend/controllers/authController.js
const User = require('../models/User');
const generateToken = require('../utils/generateToken');

/**
 * @desc    會員註冊
 * @route   POST /api/auth/register
 * @access  Public（不需登入）
 */
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, phone } = req.body;

    // 驗證必填欄位
    if (!name || !email || !password || !phone) {
      return res.status(400).json({
        success: false,
        message: '請填寫所有必填欄位'
      });
    }

    // 驗證 Email 格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Email 格式不正確'
      });
    }

    // 驗證密碼長度
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: '密碼至少需要 6 個字元'
      });
    }

    // 檢查 Email 是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: '此 Email 已被註冊'
      });
    }

    // 建立新會員
    const userId = await User.create({ name, email, password, phone });

    // 生成 JWT Token
    const token = generateToken(userId);

    res.status(201).json({
      success: true,
      message: '註冊成功',
      token,
      user: { id: userId, name, email, phone }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    會員登入
 * @route   POST /api/auth/login
 * @access  Public（不需登入）
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // 驗證必填欄位
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: '請輸入 Email 和密碼'
      });
    }

    // 查找會員
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Email 或密碼錯誤'
      });
    }

    // 驗證密碼
    const isMatch = await User.comparePassword(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Email 或密碼錯誤'
      });
    }

    // 生成 JWT Token
    const token = generateToken(user.id);

    res.json({
      success: true,
      message: '登入成功',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    取得當前會員資料
 * @route   GET /api/auth/profile
 * @access  Private（需要登入）
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    res.json({
      success: true,
      user
    });

  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新會員資料
 * @route   PUT /api/auth/profile
 * @access  Private（需要登入）
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { name, email, phone } = req.body;

    // 驗證必填欄位
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: '請填寫姓名和 Email'
      });
    }

    // 更新會員資料
    await User.update(req.user.id, { name, email, phone });

    // 取得更新後的資料
    const updatedUser = await User.findById(req.user.id);

    res.json({
      success: true,
      message: '資料更新成功',
      user: updatedUser
    });

  } catch (error) {
    next(error);
  }
};

  /**
 * @desc    刪除帳號
 * @route   DELETE /api/auth/delete
 * @access  Private（需要登入）
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id; // 從 Token 取得使用者 ID

    await User.delete(userId);

    res.json({
      success: true,
      message: '帳號與所有個人資料已成功刪除'
    });

  } catch (error) {
    // 錯誤代碼 1451 或 1452 代表違反外鍵約束 (通常是因為有訂單)
    if (error.code === 'ER_ROW_IS_REFERENCED' || error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451) {
      return res.status(400).json({
        success: false,
        message: '無法刪除帳號：您尚有未完成的訂單或交易紀錄，請聯繫客服處理。'
      });
    }
    next(error);
  }
};