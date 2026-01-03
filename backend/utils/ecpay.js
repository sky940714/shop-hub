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

  // 輔助：取得正確的 API 網址 (🔥 修正重點：加入 subType 判斷 C2C 網址)
  getApiUrl(type, subType) {
    const stage = this.isProduction ? '' : '-stage';
    const baseUrl = `https://logistics${stage}.ecpay.com.tw`;

    if (type === 'payment') return this.isProduction 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
    
    if (type === 'map') return `${baseUrl}/Express/map`;
    if (type === 'create') return `${baseUrl}/Express/Create`;

    // 🖨️ 列印網址判斷 (C2C 必須用專屬網址)
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
  getParams(order) {
    const tradeDate = this.formatDate(new Date()); 
    const totalAmount = Math.round(order.total).toString();

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: order.order_no,
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: 'ShopHub Order',
      ItemName: `訂單編號 ${order.order_no}`,
      ReturnURL: 'https://anxinshophub.com/api/ecpay/callback',
      ClientBackURL: 'https://anxinshophub.com/order/result',
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

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
  // 3. 地圖參數
  getMapParams(logisticsSubType, clientReplyURL) {
    const params = {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMARTC2C',
      ServerReplyURL: 'https://anxinshophub.com/api/ecpay/map-callback', 
      IsCollection: 'N',
    };

    // 1. 加入 ClientReplyURL
    if (clientReplyURL) {
      console.log('🔥🔥🔥 [DEBUG] 成功加入 ClientReplyURL:', clientReplyURL); // <--- 加入這行
      params.ClientReplyURL = clientReplyURL;
    } else {
      console.log('💀💀💀 [DEBUG] 警告：沒有收到 ClientReplyURL'); // <--- 加入這行
    }

    // 2. 產生檢查碼
    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    
    // 3. 加入網址
    params.actionUrl = this.getApiUrl('map');
    
    // 印出最終參數 (除了檢查碼)
    console.log('📦 [DEBUG] 送給綠界的參數:', JSON.stringify(params)); // <--- 加入這行

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
      
      ServerReplyURL: 'https://anxinshophub.com/api/ecpay/logistics-callback',
    };

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    return params;
  }

  // 5. 列印 HTML (🔥 修正重點：支援傳入物件並解構驗證碼)
  getPrintHtml(inputData) {
    // 防呆：如果 inputData 是字串（舊寫法），自動轉成物件
    let data = typeof inputData === 'string' ? { AllPayLogisticsID: inputData } : inputData;

    const { AllPayLogisticsID, LogisticsSubType, CVSPaymentNo, CVSValidationNo } = data;
    
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: String(AllPayLogisticsID),
    };

    // 如果是 C2C，必須加傳這兩個參數
    if (LogisticsSubType && LogisticsSubType.endsWith('C2C')) {
      if (CVSPaymentNo) params.CVSPaymentNo = String(CVSPaymentNo);
      if (CVSValidationNo) params.CVSValidationNo = String(CVSValidationNo);
    }

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    
    // 取得對應的 C2C 網址
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