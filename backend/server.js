// backend/server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orders');
const categoryRoutes = require('./routes/categoryRoutes');

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// 中介層設定
// ==========================================
app.use(cors({
  origin: process.env.CLIENT_URL 
    ? process.env.CLIENT_URL.split(',') 
    : ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// 設定靜態檔案路徑
app.use('/uploads', express.static('public/uploads'));

// ==========================================
// 基本路由
// ==========================================
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 ShopHub API 伺服器運行中',
    version: '1.0.0',
    status: 'OK'
  });
});

// 健康檢查路由
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'connected'
  });
});

// ==========================================
// API 路由
// ==========================================
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/upload', uploadRoutes);  // ← 加這行！
app.use('/api/cart', cartRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes); 

// ==========================================
// 404 處理（必須放在所有路由之後）
// ==========================================
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: '找不到該路由'
  });
});

// ==========================================
// 錯誤處理中介層（必須放在最後）
// ==========================================
app.use(errorHandler);

// ==========================================
// 啟動伺服器
// ==========================================
const startServer = async () => {
  try {
    // 測試資料庫連線
    await testConnection();
    
    // 啟動伺服器
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log('🚀 ShopHub 後端伺服器啟動成功！');
      console.log('='.repeat(50));
      console.log(`📡 伺服器位址：http://localhost:${PORT}`);
      console.log(`📝 環境模式：${process.env.NODE_ENV || 'development'}`);
      console.log(`🕐 啟動時間：${new Date().toLocaleString('zh-TW')}`);
      console.log('='.repeat(50) + '\n');
    });
  } catch (error) {
    console.error('❌ 伺服器啟動失敗：', error);
    process.exit(1);
  }
};

// 優雅關閉處理
process.on('SIGTERM', () => {
  console.log('\n👋 收到 SIGTERM 信號，正在關閉伺服器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n👋 收到 SIGINT 信號，正在關閉伺服器...');
  process.exit(0);
});

startServer();