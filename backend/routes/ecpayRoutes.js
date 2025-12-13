const express = require('express');
const router = express.Router();
const ecpayController = require('../controllers/ecpayController');

// ==========================================
// 1. 金流相關 (消費者付款)
// ==========================================
// 前端呼叫這個來取得跳轉參數
router.post('/checkout', ecpayController.createPayment);

// 綠界呼叫這個來通知付款結果 (背景通知)
router.post('/callback', ecpayController.handleCallback);


// ==========================================
// 2. 物流地圖相關 (消費者選門市)
// ==========================================
router.get('/map', ecpayController.getMapParams);               // 前端拿參數用
router.post('/map-callback', ecpayController.handleMapCallback); // 綠界回傳用


// ==========================================
// 3. [新增] 後台出貨相關 (管理員操作)
// ==========================================
// 這就是你剛剛缺少的，導致 404 的原因：
router.post('/create-shipping', ecpayController.createShippingOrder); // 產生寄貨單
router.get('/print-shipping', ecpayController.printShippingLabel);   // 列印託運單

module.exports = router;