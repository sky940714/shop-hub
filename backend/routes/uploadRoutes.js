const express = require('express');
const router = express.Router();
const { upload } = require('../config/upload');
const { uploadToR2, deleteFromR2 } = require('../config/r2');
const { protect } = require('../middleware/auth');

/**
 * @desc    上傳單張圖片
 * @route   POST /api/upload/image
 * @access  Private
 */
router.post('/image', protect, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    const imageUrl = await uploadToR2(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    res.json({
      success: true,
      message: '圖片上傳成功',
      imageUrl: imageUrl
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
 * @access  Private
 */
router.post('/images', protect, upload.array('images', 8), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: '請選擇要上傳的圖片'
      });
    }

    const imageUrls = await Promise.all(
      req.files.map(file => uploadToR2(file.buffer, file.originalname, file.mimetype))
    );

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

/**
 * @desc    刪除圖片
 * @route   DELETE /api/upload/image
 * @access  Private
 */
router.delete('/image', protect, async (req, res) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return res.status(400).json({ 
        success: false, 
        message: '請提供圖片 URL' 
      });
    }

    // 只刪除 R2 上的圖片
    if (imageUrl.includes('r2.dev')) {
      await deleteFromR2(imageUrl);
    }

    res.json({ 
      success: true, 
      message: '圖片已刪除'
    });

  } catch (error) {
    console.error('刪除圖片失敗：', error);
    res.status(500).json({ 
      success: false, 
      message: '刪除失敗：' + error.message 
    });
  }
});

module.exports = router;