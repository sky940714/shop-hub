const multer = require('multer');
const path = require('path');

// 改用 memoryStorage（檔案存在記憶體，不存到硬碟）
const storage = multer.memoryStorage();

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
    fileSize: 5 * 1024 * 1024,
    files: 8,
    fieldSize: 50 * 1024 * 1024
  },
  fileFilter: fileFilter
});

module.exports = { upload };