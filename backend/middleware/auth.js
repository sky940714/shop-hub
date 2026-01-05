// backend/middleware/auth.js
const jwt = require('jsonwebtoken');
const { promisePool } = require('../config/database');

/**
 * JWT 驗證中介軟體
 * 保護需要登入才能訪問的路由
 */
const protect = async (req, res, next) => {
  let token;

  // 1. 從 header 取得 token
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 2. 檢查 token 是否存在
  if (!token) {
    return res.status(401).json({
      success: false,
      message: '請先登入'
    });
  }

  try {
    // 3. 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 4. 從資料庫取得使用者資訊
    // 🔥 重要修改：這裡加入了 role 欄位
    const [users] = await promisePool.execute(
      'SELECT id, name, email, role FROM members WHERE id = ?',
      [decoded.id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: '找不到此使用者'
      });
    }

    // 將使用者資訊 (包含 role) 加入 request
    req.user = users[0];

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Token 無效或已過期'
    });
  }
};

/**
 * 🔥 新增：管理員權限驗證
 * 必須放在 protect 之後使用
 */
const admin = (req, res, next) => {
  // 檢查資料庫裡的 role 是否為 'admin'
  if (req.user && req.user.role === 'admin') {
    next(); // 是管理員，放行
  } else {
    res.status(403).json({
      success: false,
      message: '權限不足，僅限管理員操作'
    });
  }
};

// 匯出 protect 與 admin
module.exports = { protect, admin };