const db = require('../config/database'); 
const ecpayUtils = require('../utils/ecpay');

// ==========================================
// 1. 產生綠界付款資料 (金流 - 前往結帳)
// ==========================================
const createPayment = async (req, res) => {
  try {
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

      await db.pool.execute(sql, [tradeNo, orderNo]);
      
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
// 3. [新增] 取得地圖參數 (物流 - 去程)
// ==========================================
const getMapParams = (req, res) => {
  try {
    const { logisticsSubType } = req.query; // 前端傳來: UNIMART, FAMI...
    const params = ecpayUtils.getMapParams(logisticsSubType);
    res.json(params);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: '取得地圖參數失敗' });
  }
};

// ==========================================
// 4. [新增] 地圖選完後的回調 (物流 - 回程)
// ==========================================
const handleMapCallback = (req, res) => {
  try {
    // 綠界 POST 回來的門市資料
    const { CVSStoreID, CVSStoreName, CVSAddress, LogisticsSubType } = req.body;
    
    console.log('收到門市資料:', CVSStoreName);

    // 回傳一段 HTML Script，透過 postMessage 把資料傳回原本的 React 頁面
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
            window.close(); // 傳完後自動關閉視窗
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

// 統一導出所有函式
module.exports = {
  createPayment,
  handleCallback,
  getMapParams,
  handleMapCallback
};