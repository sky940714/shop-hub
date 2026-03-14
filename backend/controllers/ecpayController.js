// backend/controllers/ecpayController.js
const { promisePool } = require('../config/database'); 
const ecpayUtils = require('../utils/ecpay');
const axios = require('axios');
const qs = require('qs');

// 🔥 [新增] 輔助函數：防止 HTML 屬性被特殊符號破壞
const escapeHtml = (unsafe) => {
  if (typeof unsafe !== 'string') return unsafe;
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

// ==========================================
// 1. 產生綠界付款資料 (金流 - 前往結帳)
// ==========================================
const createPayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    if (!orderId) return res.status(400).json({ error: '缺少訂單 ID' });

    const [rows] = await promisePool.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
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
    if (!isValid) return res.send('0|ErrorMessage');

    if (ecpayData.RtnCode === '1') {
      // ✅ 正確：優先讀取我們藏好的原始編號 CustomField1
      const orderNo = ecpayData.CustomField1 || ecpayData.MerchantTradeNo; 
      const tradeNo = ecpayData.TradeNo;

      // 🔥 [新增] 防止重複處理：先檢查訂單是否已經付款
      const [checkRows] = await promisePool.execute(
        'SELECT payment_status FROM orders WHERE order_no = ?', 
        [orderNo]
      );

      // 如果訂單已經是 paid，直接回傳 OK，不要重複更新
      if (checkRows.length > 0 && checkRows[0].payment_status === 'paid') {
        console.log(`⚠️ 訂單 ${orderNo} 已經付款過，跳過重複處理`);
        return res.send('1|OK');
      }
      
      console.log(`💰 綠界付款成功！更新訂單: ${orderNo} (交易號: ${tradeNo})`);

      await promisePool.execute(
        `UPDATE orders SET payment_status = 'paid', status = 'paid', ecpay_trade_no = ?, updated_at = NOW() WHERE order_no = ?`,
        [tradeNo, orderNo] 
      );
      res.send('1|OK');
    }
  } catch (error) {
    console.error('處理綠界回調錯誤:', error);
    res.status(500).send('Error');
  }
};

// ==========================================
// 3. 取得地圖參數 (物流 - 去程 - 網頁版用)
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

// backend/controllers/ecpayController.js

// ... (前略)

// ==========================================
// 4. 地圖選完後的回調 (🔥 加強版：同時支援 網頁版 與 App)
// ==========================================
const handleMapCallback = (req, res) => {
  try {
    const { CVSStoreID, CVSStoreName, CVSAddress, LogisticsSubType } = req.body;
    
    // 1. 準備 App 用 Deep Link (針對 App 使用者)
    const storeNameEnc = encodeURIComponent(CVSStoreName || '');
    const addressEnc = encodeURIComponent(CVSAddress || '');
    const appUrl = `shophubapp://map-result?storeId=${CVSStoreID}&storeName=${storeNameEnc}&address=${addressEnc}&subtype=${LogisticsSubType}`;

    // 2. 準備網頁版用資料 (針對電腦版使用者)
    const storeData = JSON.stringify({
      storeId: CVSStoreID || '',
      storeName: CVSStoreName || '',
      storeAddress: CVSAddress || '',
      logisticsSubType: LogisticsSubType || ''
    });

    // 🔥🔥🔥 加入這行：允許 inline script 執行 🔥🔥🔥
    res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' *");

    // 3. 回傳智慧型 HTML：同時偵測網頁 popup 與 App
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>門市選擇完成</title>
  <style>
    body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9f9f9; }
    .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 320px; }
    h3 { margin-top: 0; color: #333; }
    p { color: #666; margin-bottom: 24px; font-size: 14px; }
    .btn { display: block; width: 100%; padding: 14px 0; background-color: #007aff; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-top: 10px; cursor: pointer; border: none; }
    .hidden { display: none; }
  </style>
</head>
<body>
  <div class="card">
    <h3 id="status">門市選擇完成</h3>
    
    <div id="app-content" class="hidden">
      <p>正在返回 App...<br>如果沒有反應，請點擊下方按鈕</p>
      <a href="${appUrl}" class="btn">開啟 App</a>
    </div>

    <div id="web-content" class="hidden">
      <p>已成功選擇門市，視窗將自動關閉。</p>
      <button onclick="window.close()" class="btn" style="background-color:#ccc; color:#333">關閉視窗</button>
    </div>
  </div>

  <script>
    const storeData = ${storeData};

    // 判斷邏輯：如果有 window.opener，代表是網頁彈窗 (Web)
    if (window.opener) {
      document.getElementById('web-content').classList.remove('hidden');
      window.opener.postMessage(storeData, '*');
      setTimeout(() => window.close(), 500);
    } 
    // 否則，代表是獨立視窗或 App WebView
    else {
      document.getElementById('app-content').classList.remove('hidden');
      
      // 嘗試自動跳轉
      setTimeout(function() {
        window.location.href = "${appUrl}";
      }, 300);
    }
  </script>
</body>
</html>`;
    
    res.send(html);
  } catch (error) {
    console.error('處理門市回調失敗:', error);
    res.send('<h2>處理門市資料失敗，請重試</h2>');
  }
};

// ==========================================
// 5. 產生寄貨單 (物流 - 產生編號)
// ==========================================
const createShippingOrder = async (req, res) => {
  try {
    const { orderNo } = req.body;

    const [rows] = await promisePool.execute('SELECT * FROM orders WHERE order_no = ?', [orderNo]);
    if (rows.length === 0) return res.status(404).json({ error: '無此訂單' });
    
    const order = rows[0];

    if (order.ecpay_payment_no) {
      return res.status(400).json({ error: '此訂單已產生過寄貨編號' });
    }

    let subType = order.shipping_sub_type || '';
    if (subType === 'UNIMART') subType = 'UNIMARTC2C';
    if (subType === 'FAMI') subType = 'FAMIC2C';
    if (subType === 'HILIFE') subType = 'HILIFEC2C';
    if (subType === 'OKMART') subType = 'OKMARTC2C';
    order.shipping_sub_type = subType;

    console.log(`正在建立物流訂單: ${orderNo}, 類型: ${subType}`);

    const params = ecpayUtils.getLogisticsCreateParams(order);
    const logisticsUrl = ecpayUtils.getApiUrl('create');
    
    const response = await axios.post(logisticsUrl, qs.stringify(params), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const resultText = response.data;
    console.log('綠界物流 API 回傳:', resultText);

    if (String(resultText).startsWith('1|')) {
      const resultParams = new URLSearchParams(resultText.split('|')[1]);
      const AllPayLogisticsID = resultParams.get('AllPayLogisticsID');
      const CVSPaymentNo = resultParams.get('CVSPaymentNo'); 
      const CVSValidationNo = resultParams.get('CVSValidationNo');

      await promisePool.execute(
        `UPDATE orders SET ecpay_logistics_id = ?, ecpay_payment_no = ?, ecpay_validation_no = ?, status = 'shipped', updated_at = NOW() WHERE order_no = ?`,
        [AllPayLogisticsID, CVSPaymentNo, CVSValidationNo, orderNo]
      );

      res.json({ success: true, AllPayLogisticsID, CVSPaymentNo });
    } else {
      let errorMessage = '綠界建立失敗';
      if (resultText.includes('餘額為負數') || resultText.includes('不足支付')) {
        errorMessage = '綠界帳戶餘額不足，請先至綠界後台儲值';
      } else if (resultText.includes('重複')) {
        errorMessage = '此訂單已建立過物流單';
      } else if (resultText.includes('門市')) {
        errorMessage = '超商門市資訊有誤，請確認門市代碼';
      } else {
        const match = resultText.match(/\(([^)]+)\)/);
        if (match) errorMessage = match[1];
      }
      res.status(400).json({ success: false, error: errorMessage, details: resultText });
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

    const [rows] = await promisePool.execute(
      'SELECT ecpay_logistics_id, ecpay_payment_no, ecpay_validation_no, shipping_sub_type FROM orders WHERE order_no = ?', 
      [orderNo]
    );

    if (rows.length === 0 || !rows[0].ecpay_logistics_id) {
      return res.send('<h2>錯誤：此訂單尚未產生寄貨編號，請先執行「建立物流單」</h2>');
    }

    const orderData = rows[0];
    const html = ecpayUtils.getPrintHtml({
        AllPayLogisticsID: orderData.ecpay_logistics_id,
        LogisticsSubType: orderData.shipping_sub_type || 'UNIMARTC2C', 
        CVSPaymentNo: orderData.ecpay_payment_no,
        CVSValidationNo: orderData.ecpay_validation_no
    });
    
    res.send(html);

  } catch (error) {
    console.error(error);
    res.send('列印發生錯誤');
  }
};

// ==========================================
// 7. 接收物流狀態回調 (自動更新訂單狀態)
// ==========================================
const handleLogisticsCallback = async (req, res) => {
  try {
    const logisticsData = req.body;
    console.log('📦 收到綠界物流回調:', logisticsData);

    const { AllPayLogisticsID, RtnCode } = logisticsData;
    let newStatus = null;
    const code = String(RtnCode);
    
    if (['3001', '3002', '3003', '3024', '2001'].includes(code)) {
      newStatus = 'shipped'; 
    } else if (code === '2030') {
      newStatus = 'arrived';
    } else if (code === '2067') {
      newStatus = 'completed'; 
    } else if (['2063', '2068', '2073'].includes(code)) {
      newStatus = 'returned'; 
    }

    if (newStatus) {
      const [result] = await promisePool.execute(
        `UPDATE orders SET status = ?, updated_at = NOW() WHERE ecpay_logistics_id = ?`,
        [newStatus, AllPayLogisticsID]
      );
    }
    res.send('1|OK');
  } catch (error) {
    console.error('❌ 物流回調失敗:', error);
    res.send('1|OK');
  }
};

// ==========================================
// 8. 產生金流付款頁面（給 App 用）
// ==========================================
const getPaymentPage = async (req, res) => {
  try {
    const { orderId } = req.params;
    const [rows] = await promisePool.execute('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (rows.length === 0) return res.send('<h2>找不到訂單</h2>');

    const order = rows[0];
    
    // 🔥 修正：這裡必須是包含 http/https 的完整網址！
    const baseUrl = process.env.SERVER_URL || 'http://localhost:5001';
    const appClientBackUrl = `${baseUrl}/api/ecpay/payment-app-redirect`;
    
    const params = ecpayUtils.getParams(order, appClientBackUrl);

    res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline' https://payment-stage.ecpay.com.tw;");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>前往付款...</title>
</head>
<body>
  <div style="text-align:center; margin-top:50px;">
    <h3>正在前往綠界付款頁面...</h3>
    <p>如果畫面沒有自動跳轉，請點擊下方按鈕</p>
  </div>
  <form id="ecpayForm" method="POST" action="${params.actionUrl}">
    ${Object.keys(params).filter(k => k !== 'actionUrl').map(k => 
      `<input type="hidden" name="${k}" value="${escapeHtml(String(params[k]))}" />`
    ).join('')}
    <button type="submit" style="display:block; margin: 20px auto; padding: 10px 20px;">手動前往付款</button>
  </form>
  <script>
    window.onload = function() {
      document.getElementById('ecpayForm').submit();
    };
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('產生付款頁面失敗:', error);
    res.status(500).send('<h2>伺服器錯誤</h2>');
  }
};

// ==========================================
// 9. [修正] 產生綠界地圖跳轉頁面 (給 App 用)
// ==========================================
const renderMapPage = (req, res) => {
  try {
    const { logisticsSubType } = req.query;
    
    // 定義 App 專用的回程網址
    const appRedirectUrl = "/api/ecpay/map-app-redirect";

    // 🔥 修正：將 URL 作為第二個參數傳入，讓 Utils 幫你一起加密
    const params = ecpayUtils.getMapParams(logisticsSubType, appRedirectUrl);
    
    // 注意：原本這裡手動 params.ClientReplyURL = ... 的程式碼要刪掉，因為已經在上面做完了

    const actionUrl = params.actionUrl;
    delete params.actionUrl;

    // 🔥🔥🔥 加入這行：允許 inline script 執行 🔥🔥🔥
    res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' *");

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>正在前往門市地圖...</title>
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center; padding: 50px; }
    .loading { font-size: 18px; color: #333; }
  </style>
</head>
<body>
  <div class="loading">正在前往門市選擇頁面...</div>
  <form id="ecpayMapForm" method="POST" action="${actionUrl}">
    ${Object.keys(params).map(k => 
      // 🔥 加入 escapeHtml(...) 保護
      `<input type="hidden" name="${k}" value="${escapeHtml(String(params[k]))}" />`
    ).join('')}
  </form>
  <script>
    document.getElementById('ecpayMapForm').submit();
  </script>
</body>
</html>`;

    res.send(html);
  } catch (error) {
    console.error('產生地圖頁面失敗:', error);
    res.send('<h2>無法開啟地圖頁面，請稍後再試</h2>');
  }
};

// backend/controllers/ecpayController.js

// ... (前略)

// backend/controllers/ecpayController.js

const handleAppMapRedirect = (req, res) => {
  const { CVSStoreName, CVSStoreID, CVSAddress, LogisticsSubType } = req.body;
  
  console.log('收到 App 地圖回傳，準備喚醒 App:', CVSStoreName);

  const storeName = encodeURIComponent(CVSStoreName || '');
  const address = encodeURIComponent(CVSAddress || '');
  
  const appUrl = `shophubapp://map-result?storeId=${CVSStoreID}&storeName=${storeName}&address=${address}&subtype=${LogisticsSubType}`;

  // 1. 設定 Header (第一道防線)
  res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' *");

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      
      <meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' 'unsafe-eval' *">
      
      <title>跳轉中...</title>
      <style>
        /* ... 省略 style ... */
        body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9f9f9; }
        .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 320px; }
        h3 { margin-top: 0; color: #333; }
        p { color: #666; margin-bottom: 24px; font-size: 14px; }
        .btn { display: block; width: 100%; padding: 14px 0; background-color: #007aff; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-top: 10px; }
        .btn:active { opacity: 0.8; }
      </style>
    </head>
    <body>
      <div class="card">
        <h3>門市選擇完成</h3>
        <p>正在返回 App...<br>如果沒有反應，請點擊下方按鈕</p>
        
        <a href="${appUrl}" class="btn">開啟 App</a>
      </div>

      <script>
        // 嘗試自動跳轉
        setTimeout(function() {
          window.location.href = "${appUrl}";
        }, 300);
      </script>
    </body>
    </html>
  `;
  res.send(html);
};

// ==========================================
// 10. [新增] 處理 App 付款完成後的跳轉
// ==========================================
const handleAppPaymentRedirect = (req, res) => {
  // 這裡的邏輯是通知 App "付款完成了"，讓 App 決定要跳轉到訂單頁面
  // App 端請監聽 Deep Link: shophubapp://payment-result
  const appUrl = `shophubapp://payment-result?status=success`;

  // 設定 CSP 允許 inline script
  res.set('Content-Security-Policy', "script-src 'self' 'unsafe-inline' 'unsafe-eval' *");
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>付款完成</title>
      <style>
        body { font-family: -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9f9f9; }
        .card { background: white; padding: 30px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); text-align: center; width: 80%; max-width: 320px; }
        h3 { margin-top: 0; color: #333; }
        .btn { display: block; width: 100%; padding: 14px 0; background-color: #007aff; color: white; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 16px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="card">
        <h3>付款完成</h3>
        <p>感謝您的購買！<br>正在返回 App...</p>
        <a href="${appUrl}" class="btn">返回 App</a>
      </div>

      <script>
        // 自動嘗試跳轉
        setTimeout(function() {
          window.location.href = "${appUrl}";
        }, 500);
      </script>
    </body>
    </html>
  `;
  res.send(html);
};

// ==========================================
// 統一匯出
// ==========================================
module.exports = {
  createPayment,
  handleCallback,
  getMapParams,
  handleMapCallback,
  createShippingOrder,
  printShippingLabel,
  handleLogisticsCallback,
  getPaymentPage,
  renderMapPage,
  handleAppMapRedirect,
  handleAppPaymentRedirect
};