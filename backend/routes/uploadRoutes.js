// backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const upload = require('../config/upload');
const { protect } = require('../middleware/auth');

/**
 * @desc    上傳單張圖片
 * @route   POST /api/upload/image
 * @access  Private（需要登入）
 */
router.post('/image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    // 回傳圖片 URL
    const imageUrl = `/uploads/${req.file.filename}`;

    res.json({
      success: true,
      message: '圖片上傳成功',
      imageUrl: imageUrl,
      filename: req.file.filename
    });

  } catch (error) {
    console.error('圖片上傳失敗：', error);
    res.status(500).json({
      success: false,
      message: '圖片上傳失敗'
    });
  }
});

/**
 * @desc    上傳多張圖片
 * @route   POST /api/upload/images
 * @access  Private（需要登入）
 */
router.post('/images', protect, upload.array('images', 5), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    // 回傳所有圖片 URL
    const imageUrls = req.files.map(file => `/uploads/${file.filename}`);

    res.json({
      success: true,
      message: '圖片上傳成功',
      imageUrls: imageUrls
    });

  } catch (error) {
    console.error('圖片上傳失敗：', error);
    res.status(500).json({
      success: false,
      message: '圖片上傳失敗'
    });
  }
});

module.exports = router;