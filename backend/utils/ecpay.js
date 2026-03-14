// backend/utils/ecpay.js
require('dotenv').config();
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    this.isProduction = process.env.NODE_ENV === 'production';
  }

  // 🔥 核心修正：自動根據「金流」或「物流」取得對應金鑰
  getCredentials(serviceType) {
    if (this.isProduction) {
      // 🔴 正式環境：全部共用您的正式帳號
      return {
        MerchantID: '3389062',
        HashKey: 'Uu9VuV2Z8HG3pGEy',
        HashIV: 'LzZh0CKl0FGIvw9Z'
      };
    } else {
      // 🟢 測試環境：金流與物流必須分開使用官方測試帳號
      if (serviceType === 'payment') {
        // 💳 金流測試專用帳號 (刷卡用)
        return {
          MerchantID: '3002607',
          HashKey: 'pwFHCqoQZGmho4w6',
          HashIV: 'EkRm7iFT261dpevs'
        };
      } else {
        // 📦 物流測試專用帳號 (地圖、超商單用)
        return {
          MerchantID: '2000933',
          HashKey: 'XBERn1vx6Sstq4Fc',
          HashIV: 'h19n41y59z7Yuep8'
        };
      }
    }
  }

  getBaseUrl() {
    if (this.isProduction) {
      return 'https://api.anxinshophub.com'; 
    } else {
      return process.env.SERVER_URL || 'http://localhost:5001';
    }
  }

  getApiUrl(type, subType) {
    const stage = this.isProduction ? '' : '-stage';
    const baseUrl = `https://logistics${stage}.ecpay.com.tw`;

    if (type === 'payment') return this.isProduction 
      ? 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5'
      : 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
    
    if (type === 'map') return `${baseUrl}/Express/map`;
    if (type === 'create') return `${baseUrl}/Express/Create`;

    if (type === 'print') {
      if (subType === 'UNIMARTC2C') return `${baseUrl}/Express/PrintUniMartC2COrderInfo`;
      if (subType === 'FAMIC2C') return `${baseUrl}/Express/PrintFAMIC2COrderInfo`;
      if (subType === 'HILIFEC2C') return `${baseUrl}/Express/PrintHiLifeC2COrderInfo`;
      if (subType === 'OKMARTC2C') return `${baseUrl}/Express/PrintOKMARTC2COrderInfo`;
      return `${baseUrl}/Helper/PrintTradeDocument`;
    }
  }

  getParams(order, customClientBackURL = null) {
    const creds = this.getCredentials('payment'); // 🔥 指定使用金流金鑰
    const tradeDate = this.formatDate(new Date()); 
    const totalAmount = Math.round(Number(order.total) || 0).toString(); 
    const cleanOrderNo = String(order.order_no).replace(/[^0-9]/g, ''); 
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 999).toString().padStart(3, '0');
    
    const validTradeNo = `${cleanOrderNo}${timestamp}${random}`; 
    const safeItemName = `訂單編號_${order.order_no}`.replace(/[^\u4e00-\u9fa5a-zA-Z0-9_\-]/g, '');
    const baseUrl = this.getBaseUrl();

    const params = {
      MerchantID: creds.MerchantID,
      MerchantTradeNo: validTradeNo, 
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: 'ShopHubOrder',     
      ItemName: safeItemName,        
      ReturnURL: `${baseUrl}/api/ecpay/callback`,
      ClientBackURL: customClientBackURL || 'https://www.anxinshophub.com/order/result',
      ChoosePayment: 'ALL',
      EncryptType: '1',
      CustomField1: String(order.order_no),
    };

    console.log(`\n📦 [綠界模式: ${this.isProduction ? '🔴正式' : '🟢測試'}] 準備送出付款請求`);
    params.CheckMacValue = this.generateCheckMacValue(params, 'sha256', 'payment');
    return { ...params, actionUrl: this.getApiUrl('payment') };
  }

  getMapParams(logisticsSubType, clientReplyURL) {
    const creds = this.getCredentials('logistics'); // 🔥 指定使用物流金鑰
    const baseUrl = this.getBaseUrl();
    
    let subType = logisticsSubType || 'UNIMARTC2C';
    if (subType === 'UNIMART') subType = 'UNIMARTC2C';
    if (subType === 'FAMI') subType = 'FAMIC2C';

    const params = {
      MerchantID: creds.MerchantID,
      LogisticsType: 'CVS',
      LogisticsSubType: subType,
      ServerReplyURL: `${baseUrl}/api/ecpay/map-callback`,
      IsCollection: 'N',
    };

    if (clientReplyURL) params.ClientReplyURL = clientReplyURL;

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5', 'logistics');
    params.actionUrl = this.getApiUrl('map');
    return params;
  }

  getLogisticsCreateParams(order) {
    const creds = this.getCredentials('logistics'); // 🔥 指定使用物流金鑰
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
    const baseUrl = this.getBaseUrl();

    const params = {
      MerchantID: creds.MerchantID,
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
      ServerReplyURL: `${baseUrl}/api/ecpay/logistics-callback`,
    };

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5', 'logistics');
    return params;
  }

  getPrintHtml(inputData) {
    const creds = this.getCredentials('logistics'); // 🔥 指定使用物流金鑰
    let data = typeof inputData === 'string' ? { AllPayLogisticsID: inputData } : inputData;
    const { AllPayLogisticsID, LogisticsSubType, CVSPaymentNo, CVSValidationNo } = data;
    
    const params = {
      MerchantID: creds.MerchantID,
      AllPayLogisticsID: String(AllPayLogisticsID),
    };

    if (LogisticsSubType && LogisticsSubType.endsWith('C2C')) {
      if (CVSPaymentNo) params.CVSPaymentNo = String(CVSPaymentNo);
      if (CVSValidationNo) params.CVSValidationNo = String(CVSValidationNo);
    }

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5', 'logistics');
    const printUrl = this.getApiUrl('print', LogisticsSubType);

    return `
      <form id="printForm" action="${printUrl}" method="POST">
        ${Object.keys(params).map(key => `<input type="hidden" name="${key}" value="${params[key]}" />`).join('')}
      </form>
      <script>document.getElementById("printForm").submit();</script>
    `;
  }

  // 自動判斷回傳是金流還物流，並驗證
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    
    // 透過回傳參數判斷是物流還是金流
    const isLogistics = !!(params.CVSStoreID || params.AllPayLogisticsID || params.LogisticsSubType);
    const serviceType = isLogistics ? 'logistics' : 'payment';
    const algorithm = isLogistics ? 'md5' : 'sha256';

    const calculatedCheckMacValue = this.generateCheckMacValue(params, algorithm, serviceType);
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  generateCheckMacValue(params, algorithm = 'sha256', serviceType = 'payment') {
    const creds = this.getCredentials(serviceType);
    const rawParams = { ...params };
    delete rawParams.CheckMacValue;

    const keys = Object.keys(rawParams).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    let raw = keys.map(k => `${k}=${rawParams[k]}`).join('&');
    
    raw = `HashKey=${creds.HashKey}&${raw}&HashIV=${creds.HashIV}`;

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