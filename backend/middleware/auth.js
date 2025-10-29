// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

/**
 * JWT 驗證中介軟體
 * 保護需要登入才能訪問的路由
 */
const protect = async (req, res, next) => {
  let token;

  // 從 header 取得 token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 檢查 token 是否存在
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '請先登入'
    });
  }

  try {
    // 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 從資料庫取得使用者資訊
    const [users] = await promisePool.execute(
      'SELECT id, name, email FROM members WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '找不到此使用者'
      });
    }

    // 將使用者資訊加入 request
    req.user = users[0];

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token 無效或已過期'
    });
  }
};

module.exports = { protect };