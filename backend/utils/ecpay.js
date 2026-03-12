// backend/utils/ecpay.js
require('dotenv').config();
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 🛑 正式環境設定
    this.merchantId = '3389062';              
    this.hashKey = 'Uu9VuV2Z8HG3pGEy';        
    this.hashIv = 'LzZh0CKl0FGIvw9Z';         
    
    // 強制設定為 true (正式環境)
    this.isProduction = true; 
  }

  // 輔助：取得正確的 API 網址
  getApiUrl(type, subType) {
    const stage = this.isProduction ? '' : '-stage';
    const baseUrl = `https://logistics${stage}.ecpay.com.tw`;

    if (type === 'payment') return this.isProduction 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
    
    if (type === 'map') return `${baseUrl}/Express/map`;
    if (type === 'create') return `${baseUrl}/Express/Create`;

    // 🖨️ 列印網址判斷
    if (type === 'print') {
      if (subType === 'UNIMARTC2C') return `${baseUrl}/Express/PrintUniMartC2COrderInfo`;
      if (subType === 'FAMIC2C') return `${baseUrl}/Express/PrintFAMIC2COrderInfo`;
      if (subType === 'HILIFEC2C') return `${baseUrl}/Express/PrintHiLifeC2COrderInfo`;
      if (subType === 'OKMARTC2C') return `${baseUrl}/Express/PrintOKMARTC2COrderInfo`;
      // B2C 預設
      return `${baseUrl}/Helper/PrintTradeDocument`;
    }
  }

  // 1. 金流參數
  getParams(order, customClientBackURL = null) {
    const tradeDate = this.formatDate(new Date()); 
    const totalAmount = Math.round(Number(order.total) || 0).toString(); 
    const cleanOrderNo = String(order.order_no).replace(/[^0-9]/g, ''); 
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    
    // 3. 組合 (11 + 9 = 20碼)
    const validTradeNo = `${cleanOrderNo}${timestamp}${random}`; 
    const safeItemName = `訂單編號_${order.order_no}`.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '');

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: validTradeNo, // 使用符合長度的新編號
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: 'ShopHubOrder',     // 移除空格
      ItemName: safeItemName,        // 使用無空格名稱
      ReturnURL: '/api/ecpay/callback',
      ClientBackURL: customClientBackURL || 'https://www.anxinshophub.com/order/result',
      ChoosePayment: 'ALL',
      EncryptType: '1',

      // 🔥🔥🔥 修改 3：加入這行！把原始訂單編號藏在這裡 🔥🔥🔥
      // 這樣回調時我們才能透過這個欄位知道是哪張訂單
      CustomField1: String(order.order_no),
    };

    // 🔥保留除錯 LOG (確認成功後可自行移除)
    console.log('\n=============================================');
    console.log('🔍 [除錯] 準備送給綠界的參數 (Params):');
    console.log(JSON.stringify(params, null, 2));
    console.log('=============================================\n');

    params.CheckMacValue = this.generateCheckMacValue(params, 'sha256');
    return { ...params, actionUrl: this.getApiUrl('payment') };
  }

  // 2. 驗證檢查碼
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params, 'sha256');
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 地圖參數
  getMapParams(logisticsSubType, clientReplyURL) {
    const params = {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMARTC2C',
      ServerReplyURL: '/api/ecpay/map-callback', 
      IsCollection: 'N',
    };

    if (clientReplyURL) {
      console.log('🔥🔥🔥 [DEBUG] 成功加入 ClientReplyURL:', clientReplyURL);
      params.ClientReplyURL = clientReplyURL;
    }

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    params.actionUrl = this.getApiUrl('map');
    
    console.log('📦 [DEBUG] 送給綠界的參數:', JSON.stringify(params));

    return params;
  }

  // 4. 物流訂單參數
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';
    
    let storeID = order.store_id || '';
    storeID = storeID.replace(/[^0-9]/g, ''); 

    // 防重複編號
    const randomSuffix = Date.now().toString().slice(-6); 
    const uniqueTradeNo = `${order.order_no}L${randomSuffix}`;

    // 姓名清洗
    let cleanName = (order.receiver_name || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    if (/^[a-zA-Z0-9]+$/.test(cleanName) && cleanName.length < 4) {
        cleanName = cleanName + "Cust"; 
    }
    else if (cleanName.length < 2) {
        cleanName = cleanName + "先生";
    }
    if (cleanName.length > 5) cleanName = cleanName.substring(0, 5);

    const cleanPhone = (order.receiver_phone || '0912345678').replace(/[^0-9]/g, '');

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: uniqueTradeNo,
      MerchantTradeDate: tradeDate,
      LogisticsType: 'CVS',
      LogisticsSubType: order.shipping_sub_type || 'UNIMARTC2C',
      GoodsAmount: amount,
      CollectionAmount: collectionAmount, 
      IsCollection: isCollection ? 'Y' : 'N',
      GoodsName: 'ShopHub商品',
      SenderName: 'ShopHub', 
      SenderCellPhone: '0912345678', 
      ReceiverName: cleanName,
      ReceiverCellPhone: cleanPhone,
      ReceiverEmail: order.receiver_email || '', 
      ReceiverStoreID: storeID, 
      
      ServerReplyURL: '/api/ecpay/logistics-callback',
    };

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    return params;
  }

  // 5. 列印 HTML
  getPrintHtml(inputData) {
    let data = typeof inputData === 'string' ? { AllPayLogisticsID: inputData } : inputData;
    const { AllPayLogisticsID, LogisticsSubType, CVSPaymentNo, CVSValidationNo } = data;
    
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: String(AllPayLogisticsID),
    };

    if (LogisticsSubType && LogisticsSubType.endsWith('C2C')) {
      if (CVSPaymentNo) params.CVSPaymentNo = String(CVSPaymentNo);
      if (CVSValidationNo) params.CVSValidationNo = String(CVSValidationNo);
    }

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    const printUrl = this.getApiUrl('print', LogisticsSubType);

    return `
      <form id="printForm" action="${printUrl}" method="POST">
        ${Object.keys(params).map(key => `<input type="hidden" name="${key}" value="${params[key]}" />`).join('')}
      </form>
      <script>document.getElementById("printForm").submit();</script>
    `;
  }

  // 6. 加密邏輯
  generateCheckMacValue(params, algorithm = 'sha256') {
    const rawParams = { ...params };
    delete rawParams.CheckMacValue;

    const keys = Object.keys(rawParams).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let raw = keys.map(k => `${k}=${rawParams[k]}`).join('&');
    
    raw = `HashKey=${this.hashKey}&${raw}&HashIV=${this.hashIv}`;

    // 🔥🔥🔥 [除錯 LOG] 印出加密前字串，檢查是否有亂碼或特殊符號 🔥🔥🔥
    console.log(`\n🔑 [除錯] 加密前的原始字串 (${algorithm}):`);
    console.log(raw);
    console.log('---------------------------------------------');

    let encoded = encodeURIComponent(raw).toLowerCase();

    encoded = encoded
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%20/g, '+');

    return crypto.createHash(algorithm).update(encoded).digest('hex').toUpperCase();
  }

  formatDate(date) {
    const year = date.getFullYear();
    const month = ('0' + (date.getMonth() + 1)).slice(-2);
    const day = ('0' + date.getDate()).slice(-2);
    const hours = ('0' + date.getHours()).slice(-2);
    const minutes = ('0' + date.getMinutes()).slice(-2);
    const seconds = ('0' + date.getSeconds()).slice(-2);
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  }
}

module.exports = new ECPayUtils();