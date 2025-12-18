// backend/utils/ecpay.js
require('dotenv').config();
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 🛑 修正重點：不再依賴 .env，直接填入正式資料 (霸王硬上弓)
    // 這樣就絕對不可能跑去測試環境了
    
    this.merchantId = '3389062';              // 你的正式商店代號
    this.hashKey = 'Uu9VuV2Z8HG3pGEy';        // 你的正式 HashKey
    this.hashIv = 'LzZh0CKl0FGIvw9Z';         // 你的正式 HashIV
    
    // 強制設定為 true (正式環境)
    this.isProduction = true; 
  }

  // 輔助：取得正確的 API 網址
  getApiUrl(type) {
    // 因為上面強制設為 true，所以這裡一定會跑進上面的 if，絕對不會跑 else
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
      // 這裡還是可以用 process.env，因為這時候 .env 通常已經載入好了，或是你也可以手動寫死網址
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

  // 4. 物流訂單參數
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';
    const storeID = order.store_id || ''; 

    // 過濾姓名
    let cleanName = (order.receiver_name || '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    if (!cleanName) cleanName = 'Customer';
    if (cleanName.length > 10) cleanName = cleanName.substring(0, 10);

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: order.order_no + 'L',
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
      ReceiverCellPhone: order.receiver_phone || '0912345678',
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