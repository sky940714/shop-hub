// backend/routes/ecpayRoutes.js
const express = require('express');
const router = express.Router();
const ecpayController = require('../controllers/ecpayController');

// 前端呼叫這個來取得跳轉參數
router.post('/checkout', ecpayController.createPayment);

// 綠界呼叫這個來通知付款結果 (背景通知)
router.post('/callback', ecpayController.handleCallback);

module.exports = router;