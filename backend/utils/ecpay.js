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
  getApiUrl(type) {
    if (this.isProduction) {
      if (type === 'payment') return 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
      if (type === 'map') return 'https://logistics.ecpay.com.tw/Express/map';
      if (type === 'create') return 'https://logistics.ecpay.com.tw/Express/Create';
      if (type === 'print') return 'https://logistics.ecpay.com.tw/Helper/PrintTradeDocument';
    } else {
      if (type === 'payment') return 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5';
      if (type === 'map') return 'https://logistics-stage.ecpay.com.tw/Express/map';
      if (type === 'create') return 'https://logistics-stage.ecpay.com.tw/Express/Create';
      if (type === 'print') return 'https://logistics-stage.ecpay.com.tw/Helper/PrintTradeDocument';
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
  getMapParams(logisticsSubType) {
    return {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMARTC2C',
      ServerReplyURL: 'https://anxinshophub.com/api/ecpay/map-callback',
      IsCollection: 'N',
      actionUrl: this.getApiUrl('map')
    };
  }

  // 4. 物流訂單參數 (🛑 這裡是最重要的修正)
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';
    
    // ✅ 修正 1：門市代號清洗 (只留數字)
    let storeID = order.store_id || '';
    storeID = storeID.replace(/[^0-9]/g, ''); 

    // ✅ 修正 2：訂單編號防重複 (加上隨機數)
    const randomSuffix = Date.now().toString().slice(-6); // 建議改用 6 位數更保險
    const uniqueTradeNo = `${order.order_no}L${randomSuffix}`;

    // ✅ 修正 3：姓名長度檢查 (這是你缺少的!)
    let cleanName = (order.receiver_name || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    
    // 如果是純英文且少於 4 字，補上 "Cust"
    if (/^[a-zA-Z0-9]+$/.test(cleanName) && cleanName.length < 4) {
        cleanName = cleanName + "Cust"; 
    }
    // 如果包含中文且少於 2 字 (例如單名 "王")，補上 "先生"
    else if (cleanName.length < 2) {
        cleanName = cleanName + "先生";
    }
    
    // 截斷過長的名字 (取前 5 個字最保險，因為中文限制 5 字)
    if (cleanName.length > 5) cleanName = cleanName.substring(0, 5);

    // ✅ 修正 4：手機號碼清洗 (確保無符號)
    const cleanPhone = (order.receiver_phone || '0912345678').replace(/[^0-9]/g, '');

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: uniqueTradeNo, // 使用不重複的編號
      MerchantTradeDate: tradeDate,
      LogisticsType: 'CVS',
      LogisticsSubType: order.shipping_sub_type || 'UNIMARTC2C',
      GoodsAmount: amount,
      CollectionAmount: collectionAmount, 
      IsCollection: isCollection ? 'Y' : 'N',
      GoodsName: 'ShopHub商品',
      SenderName: 'ShopHub', 
      SenderCellPhone: '0912345678', 
      ReceiverName: cleanName,        // 使用處理過的名字
      ReceiverCellPhone: cleanPhone,  // 使用處理過的手機
      ReceiverEmail: order.receiver_email || '', 
      ReceiverStoreID: storeID, 
      
      ServerReplyURL: 'https://anxinshophub.com/api/ecpay/logistics-callback',
    };

    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    return params;
  }

  // 5. 列印 HTML
  getPrintHtml(allPayLogisticsID) {
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: allPayLogisticsID,
    };
    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');

    return `
      <form id="printForm" action="${this.getApiUrl('print')}" method="POST">
        <input type="hidden" name="MerchantID" value="${params.MerchantID}" />
        <input type="hidden" name="AllPayLogisticsID" value="${params.AllPayLogisticsID}" />
        <input type="hidden" name="CheckMacValue" value="${params.CheckMacValue}" />
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