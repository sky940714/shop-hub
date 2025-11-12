// backend/routes/uploadRoutes.js
const express = require('express');
const router = express.Router();
const { upload, getImageUrl } = require('../config/upload');
const { protect } = require('../middleware/auth');
const fs = require('fs');  // ← 新增：用於刪除檔案
const path = require('path');  // ← 新增：用於處理路徑

/**
 * @desc    上傳單張圖片
 * @route   POST /api/upload/images
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

    const imageUrl = getImageUrl(req.file.filename);

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
router.post('/images', protect, upload.array('images', 8), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    const imageUrls = req.files.map(file => getImageUrl(file.filename));

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

// ============================================
// ✅ 新增：刪除圖片 API
// ============================================

/**
 * @desc    刪除圖片
 * @route   DELETE /api/upload/image
 * @access  Private（需要登入）
 */
router.delete('/image', protect, (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: '請提供圖片 URL' 
      });
    }

    console.log('🗑️ 收到刪除請求，圖片 URL：', imageUrl);

    // 從 URL 提取檔案名稱
    // 例如：http://45.32.24.240/uploads/1030-1761879076756-817691960.jpg
    // 提取：1030-1761879076756-817691960.jpg
    const fileName = imageUrl.split('/').pop();
    
    // 建構完整的檔案路徑
    // 假設您的上傳資料夾在 backend/uploads
    const filePath = path.join(__dirname, '../uploads', fileName);
    
    console.log('🗑️ 要刪除的檔案路徑：', filePath);

    // 檢查檔案是否存在
    if (fs.existsSync(filePath)) {
      // 刪除檔案
      fs.unlinkSync(filePath);
      console.log('✅ 檔案已刪除：', fileName);
      
      return res.json({ 
        success: true, 
        message: '圖片已刪除',
        deletedFile: fileName
      });
    } else {
      console.log('⚠️ 檔案不存在：', filePath);
      
      // 即使檔案不存在，也回傳成功（因為結果是一樣的）
      return res.json({ 
        success: true, 
        message: '圖片不存在或已被刪除' 
      });
    }

  } catch (error) {
    console.error('❌ 刪除圖片失敗：', error);
    return res.status(500).json({ 
      success: false, 
      message: '刪除失敗：' + error.message 
    });
  }
});

module.exports = router;