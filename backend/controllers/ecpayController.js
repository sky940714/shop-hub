// backend/controllers/ecpayController.js
// ↓↓↓ 請確認這裡引入的是你專案的資料庫連線物件 (通常是有 promise() 的 pool)
const db = require('../config/database'); 
const ecpayUtils = require('../utils/ecpay');

// 1. 產生綠界付款資料 (前往結帳)
const createPayment = async (req, res) => {
  try {
    // 前端傳來訂單 ID (orders table 的 id)
    const { orderId } = req.body; 

    if (!orderId) {
      return res.status(400).json({ error: '缺少訂單 ID' });
    }

    // 從資料庫查詢該筆訂單
    const [rows] = await db.pool.execute(
      'SELECT * FROM orders WHERE id = ?', 
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '找不到訂單' });
    }

    const order = rows[0];

    // 呼叫工具產生綠界需要的參數
    const paymentParams = ecpayUtils.getParams(order);

    res.json(paymentParams);

  } catch (error) {
    console.error('建立綠界訂單失敗:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
};

// 2. 接收綠界背景通知 (Webhook)
const handleCallback = async (req, res) => {
  try {
    const ecpayData = req.body; // 綠界是用 application/x-www-form-urlencoded POST 過來
    console.log('收到綠界回調:', ecpayData);

    // A. 驗證檢查碼 (防止偽造)
    const isValid = ecpayUtils.verifyCheckMacValue(ecpayData);

    if (!isValid) {
      console.error('檢查碼驗證失敗 (簽章錯誤)');
      return res.send('0|ErrorMessage');
    }

    // B. 確認交易是否成功 (RtnCode === '1')
    if (ecpayData.RtnCode === '1') {
      const orderNo = ecpayData.MerchantTradeNo; // 你的訂單編號
      const tradeNo = ecpayData.TradeNo;         // 綠界的交易編號
      const paymentDate = ecpayData.PaymentDate; // 付款時間

      // C. 更新資料庫狀態
      // 根據你的 schema，我們要更新: payment_status, status, ecpay_trade_no
      const sql = `
        UPDATE orders 
        SET 
          payment_status = 'paid',
          status = 'paid',
          ecpay_trade_no = ?,
          updated_at = NOW()
        WHERE order_no = ?
      `;

      await db.pool.execute(sql, [tradeNo, orderNo]);
      
      console.log(`訂單 ${orderNo} 已更新為付款完成`);

      // D. 回傳 '1|OK' 給綠界 (這是規定)
      res.send('1|OK');
    } else {
      console.log('交易失敗或代碼非 1');
      res.send('1|OK'); // 即使失敗通常也回傳收到，避免綠界一直重試
    }

  } catch (error) {
    console.error('處理綠界回調錯誤:', error);
    res.status(500).send('Error');
  }
};

module.exports = {
  createPayment,
  handleCallback
};