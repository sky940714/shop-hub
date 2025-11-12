// backend/config/upload.js
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 確保上傳目錄存在
const uploadDir = 'public/uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// 設定儲存位置和檔案名稱
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 產生唯一檔名：時間戳_隨機數_原檔名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, name + '-' + uniqueSuffix + ext);
  }
});

// 檔案過濾器：只允許圖片
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片檔案 (JPEG, JPG, PNG, GIF, WEBP)'));
  }
};

// 設定上傳限制
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 單檔限制 5MB
    files: 8,                   // ← 新增：最多 8 個檔案
    fieldSize: 50 * 1024 * 1024 // ← 新增：總大小限制 50MB
  },
  fileFilter: fileFilter
});

// ⭐ 新增：生成圖片 URL 的函式
const getImageUrl = (filename) => {
  // 從環境變數讀取基礎 URL
  const baseUrl = process.env.API_BASE_URL || process.env.CLIENT_URL || 'http://localhost:5001';
  return `${baseUrl}/uploads/${filename}`;
};

// ⭐ 重要：匯出 upload 和 getImageUrl
module.exports = {
  upload,
  getImageUrl,
  uploadDir
};