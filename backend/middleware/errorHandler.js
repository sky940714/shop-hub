// backend/middleware/errorHandler.js

/**
 * 全域錯誤處理中介軟體
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ 錯誤詳情：', err);

  // 預設錯誤
  let error = {
    statusCode: err.statusCode || 500,
    message: err.message || '伺服器錯誤'
  };

  // MySQL 重複鍵錯誤（例如 email 已存在）
  if (err.code === 'ER_DUP_ENTRY') {
    error.statusCode = 400;
    error.message = '此 Email 已被註冊';
  }

  // MySQL 外鍵約束錯誤
  if (err.code === 'ER_NO_REFERENCED_ROW_2') {
    error.statusCode = 400;
    error.message = '關聯的資料不存在';
  }

  res.status(error.statusCode).json({
    success: false,
    message: error.message
  });
};

module.exports = errorHandler;