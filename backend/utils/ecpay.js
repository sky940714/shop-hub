// backend/utils/ecpay.js
require('dotenv').config();
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 🔥 1. 系統自動判斷環境：看 .env 裡的 NODE_ENV 是不是 production
    this.isProduction = process.env.NODE_ENV === 'production';

    // 🔥 2. 系統自動切換金鑰
    if (this.isProduction) {
        // 🔴 [正式環境] 您的真實金鑰 (會產生真實訂單、扣真錢)
        this.merchantId = '3389062';              
        this.hashKey = 'Uu9VuV2Z8HG3pGEy';        
        this.hashIv = 'LzZh0CKl0FGIvw9Z'; 
    } else {
        // 🟢 [本地測試環境] 綠界官方的「測試金鑰」 (隨便測都不會扣錢，也不會真的叫物流)
        this.merchantId = '3002607';              
        this.hashKey = 'pwFHCqoQZGmho4w6';        
        this.hashIv = 'EkRm7iFT261dpevs';
    }
  }

  // 🔥 3. 系統自動決定回傳網址
  getBaseUrl() {
    if (this.isProduction) {
      // 正式機：強制使用正式網域，最安全不怕錯
      return 'https://api.anxinshophub.com'; 
    } else {
      // 測試機：讀取 .env 裡面的 ngrok 網址，如果沒填就先用 localhost 擋著
      return process.env.SERVER_URL || 'http://localhost:5001';
    }
  }

  // 輔助：取得正確的 API 網址 (根據 isProduction 自動切換測試機/正式機 API)
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
    
    const validTradeNo = `${cleanOrderNo}${timestamp}${random}`; 
    const safeItemName = `訂單編號_${order.order_no}`.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '');

    const baseUrl = this.getBaseUrl(); // 🔥 呼叫自動判斷網址的方法

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: validTradeNo, 
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: 'ShopHubOrder',     
      ItemName: safeItemName,        
      ReturnURL: `${baseUrl}/api/ecpay/callback`, // 🔥 自動帶入網址
      ClientBackURL: customClientBackURL || 'https://www.anxinshophub.com/order/result',
      ChoosePayment: 'ALL',
      EncryptType: '1',
      CustomField1: String(order.order_no),
    };

    console.log(`\n📦 [綠界模式: ${this.isProduction ? '🔴正式' : '🟢測試'}] 準備送出請求`);
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
    const baseUrl = this.getBaseUrl(); // 🔥 自動判斷網址

    const params = {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMARTC2C',
      ServerReplyURL: `${baseUrl}/api/ecpay/map-callback`, // 🔥 自動帶入網址
      IsCollection: 'N',
    };

    if (clientReplyURL) params.ClientReplyURL = clientReplyURL;

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    params.actionUrl = this.getApiUrl('map');
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

    const randomSuffix = Date.now().toString().slice(-6); 
    const uniqueTradeNo = `${order.order_no}L${randomSuffix}`;

    let cleanName = (order.receiver_name || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    if (/^[a-zA-Z0-9]+$/.test(cleanName) && cleanName.length < 4) cleanName += "Cust"; 
    else if (cleanName.length < 2) cleanName += "先生";
    if (cleanName.length > 5) cleanName = cleanName.substring(0, 5);

    const cleanPhone = (order.receiver_phone || '0912345678').replace(/[^0-9]/g, '');
    const baseUrl = this.getBaseUrl(); // 🔥 自動判斷網址

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
      ServerReplyURL: `${baseUrl}/api/ecpay/logistics-callback`, // 🔥 自動帶入網址
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

    let encoded = encodeURIComponent(raw).toLowerCase()
      .replace(/%2d/g, '-').replace(/%5f/g, '_').replace(/%2e/g, '.')
      .replace(/%21/g, '!').replace(/%2a/g, '*').replace(/%28/g, '(')
      .replace(/%29/g, ')').replace(/%20/g, '+');

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