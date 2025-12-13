// backend/controllers/ecpayController.js
const { promisePool } = require('../config/database'); // 修正 1：直接解構取出 promisePool
const ecpayUtils = require('../utils/ecpay');
const axios = require('axios');
const qs = require('qs');

// ==========================================
// 1. 產生綠界付款資料 (金流 - 前往結帳)
// ==========================================
const createPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) {
      return res.status(400).json({ error: '缺少訂單 ID' });
    }

    // 修正 2：使用 promisePool.execute
    const [rows] = await promisePool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: '找不到訂單' });
    }

    const order = rows[0];
    const paymentParams = ecpayUtils.getParams(order);

    res.json(paymentParams);

  } catch (error) {
    console.error('建立綠界訂單失敗:', error);
    res.status(500).json({ error: '伺服器錯誤' });
  }
};

// ==========================================
// 2. 接收綠界背景通知 (金流 - Webhook)
// ==========================================
const handleCallback = async (req, res) => {
  try {
    const ecpayData = req.body;
    console.log('收到綠界回調:', ecpayData);

    const isValid = ecpayUtils.verifyCheckMacValue(ecpayData);

    if (!isValid) {
      console.error('檢查碼驗證失敗 (簽章錯誤)');
      return res.send('0|ErrorMessage');
    }

    if (ecpayData.RtnCode === '1') {
      const orderNo = ecpayData.MerchantTradeNo;
      const tradeNo = ecpayData.TradeNo;

      const sql = `
        UPDATE orders 
        SET 
          payment_status = 'paid',
          status = 'paid',
          ecpay_trade_no = ?,
          updated_at = NOW()
        WHERE order_no = ?
      `;

      // 修正 3：使用 promisePool.execute
      await promisePool.execute(sql, [tradeNo, orderNo]);

      console.log(`訂單 ${orderNo} 已更新為付款完成`);
      res.send('1|OK');
    } else {
      console.log('交易失敗或代碼非 1');
      res.send('1|OK');
    }

  } catch (error) {
    console.error('處理綠界回調錯誤:', error);
    res.status(500).send('Error');
  }
};

// ==========================================
// 3. 取得地圖參數 (物流 - 去程)
// ==========================================
const getMapParams = (req, res) => {
  try {
    const { logisticsSubType } = req.query;
    const params = ecpayUtils.getMapParams(logisticsSubType);
    res.json(params);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '取得地圖參數失敗' });
  }
};

// ==========================================
// 4. 地圖選完後的回調 (物流 - 回程)
// ==========================================
const handleMapCallback = (req, res) => {
  try {
    const { CVSStoreID, CVSStoreName, CVSAddress, LogisticsSubType } = req.body;
    console.log('收到門市資料:', CVSStoreName);

    const html = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"></head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              storeId: '${CVSStoreID}',
              storeName: '${CVSStoreName}',
              storeAddress: '${CVSAddress}',
              logisticsSubType: '${LogisticsSubType}'
            }, '*');
            window.close();
          }
        </script>
      </body>
      </html>
    `;
    res.send(html);
  } catch (error) {
    console.error(error);
    res.send('處理門市資料失敗');
  }
};

// ==========================================
// 5. 產生寄貨單 (按鈕 A)
// ==========================================
const createShippingOrder = async (req, res) => {
  try {
    const { orderNo } = req.body;

    // 修正 4：使用 promisePool.execute
    const [rows] = await promisePool.execute('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    if (rows.length === 0) return res.status(404).json({ error: '無此訂單' });
    const order = rows[0];

    if (order.ecpay_payment_no) {
      return res.status(400).json({ error: '此訂單已產生過寄貨編號' });
    }

    const params = ecpayUtils.getLogisticsCreateParams(order);
    const logisticsUrl = 'https://logistics-stage.ecpay.com.tw/Express/Create';
    
    const response = await axios.post(logisticsUrl, qs.stringify(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const resultText = response.data;
    console.log('綠界物流回傳:', resultText);

    if (String(resultText).startsWith('1|')) {
      const resultParams = new URLSearchParams(resultText.split('|')[1]);
      const AllPayLogisticsID = resultParams.get('AllPayLogisticsID');
      const CVSPaymentNo = resultParams.get('CVSPaymentNo');

      // 修正 5：使用 promisePool.execute
      await promisePool.execute(
        `UPDATE orders SET ecpay_logistics_id = ?, ecpay_payment_no = ?, status = 'shipped', updated_at = NOW() WHERE order_no = ?`,
        [AllPayLogisticsID, CVSPaymentNo, orderNo]
      );

      res.json({ success: true, AllPayLogisticsID, CVSPaymentNo });
    } else {
      res.status(400).json({ error: '綠界建立失敗', details: resultText });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '建立物流訂單失敗' });
  }
};

// ==========================================
// 6. 列印託運單 (按鈕 B)
// ==========================================
const printShippingLabel = async (req, res) => {
  try {
    const { orderNo } = req.query;

    // 修正 6：使用 promisePool.execute
    const [rows] = await promisePool.execute('SELECT ecpay_logistics_id FROM orders WHERE order_no = ?', [orderNo]);

    if (rows.length === 0 || !rows[0].ecpay_logistics_id) {
      return res.send('此訂單尚未產生寄貨編號，無法列印');
    }

    const html = ecpayUtils.getPrintHtml(rows[0].ecpay_logistics_id);
    res.send(html);

  } catch (error) {
    console.error(error);
    res.send('列印發生錯誤');
  }
};

module.exports = {
  createPayment,
  handleCallback,
  getMapParams,
  handleMapCallback,
  createShippingOrder,
  printShippingLabel
};