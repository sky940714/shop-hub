// backend/config/database.js
const mysql = require('mysql2');
require('dotenv').config();

// 建立資料庫連線池（Connection Pool）
// 連線池比單一連線更有效率，可以重複使用連線
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,      // 最多同時 10 個連線
  queueLimit: 0,           // 無限制排隊等待
  enableKeepAlive: true,   // 保持連線活躍
  keepAliveInitialDelay: 0
});

// 使用 Promise 版本（更容易搭配 async/await）
const promisePool = pool.promise();

// 測試資料庫連線函數
const testConnection = async () => {
  try {
    const connection = await promisePool.getConnection();
    console.log('✅ MySQL 資料庫連線成功！');
    console.log(`📊 資料庫：${process.env.DB_NAME}`);
    console.log(`🖥️  主機：${process.env.DB_HOST}:${process.env.DB_PORT}`);
    connection.release(); // 釋放連線回連線池
    return true;
  } catch (error) {
    console.error('❌ MySQL 資料庫連線失敗：', error.message);
    console.error('💡 請檢查：');
    console.error('   1. MySQL 服務是否已啟動');
    console.error('   2. .env 檔案中的資料庫帳號密碼是否正確');
    console.error('   3. 資料庫 shophub 是否已建立');
    process.exit(1); // 連線失敗就終止程式
  }
};

// 執行 SQL 查詢的輔助函數
const query = async (sql, params) => {
  try {
    const [results] = await promisePool.execute(sql, params);
    return results;
  } catch (error) {
    console.error('SQL 查詢錯誤：', error.message);
    throw error;
  }
};

module.exports = {
  pool,              // 原始連線池
  promisePool,       // Promise 版本的連線池
  testConnection,    // 測試連線函數
  query,              // 執行查詢函數
  getConnection: () => promisePool.getConnection()  // ← 加這行
};