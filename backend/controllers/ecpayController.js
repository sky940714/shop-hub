// backend/controllers/ecpayController.js
const { promisePool } = require('../config/database'); // ✅ 這是正確的引用方式
const ecpayUtils = require('../utils/ecpay');
const axios = require('axios');
const qs = require('qs');

// ==========================================
// 1. 產生綠界付款資料 (金流 - 前往結帳)
// ==========================================
const createPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    if (!orderId) return res.status(400).json({ error: '缺少訂單 ID' });

    const [rows] = await promisePool.execute(
      'SELECT * FROM orders WHERE id = ?',
      [orderId]
    );

    if (rows.length === 0) return res.status(404).json({ error: '找不到訂單' });

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

      // 更新訂單狀態
      await promisePool.execute(
        `UPDATE orders SET payment_status = 'paid', status = 'paid', ecpay_trade_no = ?, updated_at = NOW() WHERE order_no = ?`,
        [tradeNo, orderNo]
      );

      console.log(`訂單 ${orderNo} 已更新為付款完成`);
      res.send('1|OK');
    } else {
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
    // 這裡前端傳過來應該已經是 C2C 了，如果不放心也可以這裡再防呆一次
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
    console.log('收到門市資料:', CVSStoreName, LogisticsSubType);

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
// 5. 產生寄貨單 (物流 - 產生編號) - 關鍵修正區 ⚠️
// ==========================================
const createShippingOrder = async (req, res) => {
  try {
    const { orderNo } = req.body;

    // 1. 撈取訂單
    const [rows] = await promisePool.execute('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    if (rows.length === 0) return res.status(404).json({ error: '無此訂單' });
    
    // 雖然 const 宣告物件不能重新賦值，但物件屬性可以修改
    const order = rows[0];

    // 2. 檢查是否已經產生過
    if (order.ecpay_payment_no) {
      return res.status(400).json({ error: '此訂單已產生過寄貨編號' });
    }

    // 🔥 關鍵修正：強制將物流類型轉為 C2C (防呆機制)
    // 就算資料庫存的是 UNIMART (B2C)，這裡強制改成 UNIMARTC2C
    let subType = order.shipping_sub_type || '';
    if (subType === 'UNIMART') subType = 'UNIMARTC2C';
    if (subType === 'FAMI') subType = 'FAMIC2C';
    if (subType === 'HILIFE') subType = 'HILIFEC2C';
    if (subType === 'OKMART') subType = 'OKMARTC2C';
    
    // 將修正後的類型覆寫回 order 物件，讓 utils 吃到正確的值
    order.shipping_sub_type = subType;

    console.log(`正在建立物流訂單: ${orderNo}, 類型: ${subType}`);

    // 3. 呼叫 Utils 產生參數
    const params = ecpayUtils.getLogisticsCreateParams(order);
    const logisticsUrl = ecpayUtils.getApiUrl('create');
    
    // 4. 發送請求給綠界
    const response = await axios.post(logisticsUrl, qs.stringify(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const resultText = response.data;
    console.log('綠界物流 API 回傳:', resultText);

    // 5. 解析回傳結果
    if (String(resultText).startsWith('1|')) {
      const resultParams = new URLSearchParams(resultText.split('|')[1]);
      const AllPayLogisticsID = resultParams.get('AllPayLogisticsID');
      const CVSPaymentNo = resultParams.get('CVSPaymentNo'); // 寄貨編號

      // 6. 更新資料庫
      await promisePool.execute(
        `UPDATE orders SET ecpay_logistics_id = ?, ecpay_payment_no = ?, status = 'shipped', updated_at = NOW() WHERE order_no = ?`,
        [AllPayLogisticsID, CVSPaymentNo, orderNo]
      );

      res.json({ success: true, AllPayLogisticsID, CVSPaymentNo });
    } else {
      // 失敗時回傳詳細錯誤
      res.status(400).json({ error: '綠界建立失敗', details: resultText });
    }
  } catch (error) {
    console.error('建立物流單失敗:', error);
    res.status(500).json({ error: '建立物流訂單失敗' });
  }
};

// ==========================================
// 6. 列印託運單 (物流 - 列印)
// ==========================================
const printShippingLabel = async (req, res) => {
  try {
    const { orderNo } = req.query;

    const [rows] = await promisePool.execute('SELECT ecpay_logistics_id FROM orders WHERE order_no = ?', [orderNo]);

    if (rows.length === 0 || !rows[0].ecpay_logistics_id) {
      return res.send('<h2>錯誤：此訂單尚未產生寄貨編號，請先執行「建立物流單」</h2>');
    }

    const html = ecpayUtils.getPrintHtml(rows[0].ecpay_logistics_id);
    res.send(html);

  } catch (error) {
    console.error(error);
    res.send('列印發生錯誤');
  }
};

const handleLogisticsCallback = (req, res) => {
  try {
    console.log('收到物流狀態回調:', req.body);
    res.send('1|OK');
  } catch (error) {
    console.error(error);
    res.send('1|OK');
  }
};

module.exports = {
  createPayment,
  handleCallback,
  getMapParams,
  handleMapCallback,
  createShippingOrder,
  printShippingLabel,
  handleLogisticsCallback
};