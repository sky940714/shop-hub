// backend/routes/ecpayRoutes.js
const express = require('express');
const router = express.Router();
const ecpayController = require('../controllers/ecpayController');

// 前端呼叫這個來取得跳轉參數
router.post('/checkout', ecpayController.createPayment);

// 綠界呼叫這個來通知付款結果 (背景通知)
router.post('/callback', ecpayController.handleCallback);

// [新增] 物流地圖路由
router.get('/map', ecpayController.getMapParams);               // 前端拿參數用
router.post('/map-callback', ecpayController.handleMapCallback); // 綠界回傳用

module.exports = router;