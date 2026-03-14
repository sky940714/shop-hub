// backend/server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { testConnection } = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const errorHandler = require('./middleware/errorHandler');
const productRoutes = require('./routes/productRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orders');
const categoryRoutes = require('./routes/categoryRoutes');
const memberRoutes = require('./routes/members');
const wishlistRoutes = require('./routes/wishlistRoutes');
const ecpayRoutes = require('./routes/ecpayRoutes');
const pickupStoresRoutes = require('./routes/pickup-stores');
const bannerRoutes = require('./routes/bannerRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const returnRoutes = require('./routes/returns'); // ← 新增這行

const app = express();
const PORT = process.env.PORT || 5001;

// ==========================================
// 中介層設定
// ==========================================
app.use(cors({
  origin: function (origin, callback) {
    // 允許的來源清單
    const allowedOrigins = [
      'http://localhost:3000',        // 本機開發網頁
      'http://localhost:3002',        // 新增這行：解決新專案 CORS 報錯
      'http://localhost:5001',        // 本機後端 (處理您報錯中出現的來源)
      'https://imparipinnate-avidly-cesar.ngrok-free.dev',
      'https://www.anxinshophub.com', // 您的正式網站
      'https://anxinshophub.com',     // 沒有 www
      'https://logistics.ecpay.com.tw', // 綠界物流
      'https://logistics-stage.ecpay.com.tw', // 🔥 新增：綠界物流 (測試環境)
      'capacitor://localhost',        // iOS App 來源
      'http://localhost',             // Android App 來源
      'https://localhost'             // 部分 Android 版本
    ];
    
    // 邏輯判斷：
    // 1. !origin: 允許沒有來源的請求 (某些手機請求或 Postman)
    // 2. 處理帶有斜線的網址 (例如報錯中的 http://localhost:5001/)
    const cleanOrigin = origin ? origin.replace(/\/$/, '') : null;

    if (!origin || allowedOrigins.indexOf(cleanOrigin) !== -1 || origin.startsWith('http://192.168.')) {
      callback(null, true);
    } else {
      console.log('❌ 被 CORS 擋住的來源:', origin); // 方便除錯
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // 允許帶有 Cookie/Token 的請求
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], // 允許的方法
  allowedHeaders: ['Content-Type', 'Authorization'] // 允許的標頭
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// 設定靜態檔案路徑 (使用絕對路徑，避免找不到檔案)
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

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
app.use('/api/upload', uploadRoutes); 
app.use('/api/cart', cartRoutes); 
app.use('/api/orders', orderRoutes);
app.use('/api/categories', categoryRoutes); 
app.use('/api/members', memberRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/ecpay', ecpayRoutes);
app.use('/api/pickup-stores', pickupStoresRoutes);
app.use('/api/banners', bannerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/returns', returnRoutes);

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