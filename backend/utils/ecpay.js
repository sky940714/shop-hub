// backend/utils/ecpay.js
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 測試環境參數 (固定值)
    this.merchantId = '2000132';
    this.hashKey = '5294y06JbISpM5x9';
    this.hashIv = 'v77hoKGq4kWxNNIS';
  }

  // [請新增這個方法在 class 裡面]
  getMapParams(logisticsSubType) {
    return {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMART',
      // 這裡要改成你的後端 callback 網址
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/map-callback`,
      IsCollection: 'N',
      actionUrl: 'https://logistics-stage.ecpay.com.tw/Express/map'
    };
  }

  // 1. 產生給綠界的表單參數
  getParams(order) {
    // 將資料庫的 created_at 轉為綠界要的格式 (yyyy/MM/dd HH:mm:ss)
    const tradeDate = this.formatDate(new Date()); 
    
    // 將金額轉為整數字串 (綠界不收小數點)
    const totalAmount = Math.round(order.total).toString();

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: order.order_no, // 使用你的 order_no
      MerchantTradeDate: tradeDate,
      PaymentType: 'aio',
      TotalAmount: totalAmount,
      TradeDesc: 'ShopHub Order', // 交易描述
      ItemName: `訂單編號 ${order.order_no}`, // 商品名稱
      ReturnURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/callback`, // 背景通知網址
      ClientBackURL: `${process.env.CLIENT_URL || 'http://45.32.24.240'}/order/result`, // 前端跳轉網址
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    // 計算檢查碼
    params.CheckMacValue = this.generateCheckMacValue(params);

    return {
      ...params,
      actionUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
    };
  }

  // 2. 驗證綠界回傳的檢查碼 (用於 callback)
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params);
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 核心加密邏輯
  generateCheckMacValue(params) {
    // 複製一份並移除 CheckMacValue 本身 (如果有)
    const rawParams = { ...params };
    delete rawParams.CheckMacValue;

    // A. 依照 key 排序
    const keys = Object.keys(rawParams).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    // B. 組成查詢字串
    let raw = keys.map(k => `${k}=${rawParams[k]}`).join('&');
    
    // C. 前後加上 Key 和 IV
    raw = `HashKey=${this.hashKey}&${raw}&HashIV=${this.hashIv}`;

    // D. URL Encode (綠界特殊規則)
    let encoded = encodeURIComponent(raw).toLowerCase()
      .replace(/%20/g, '+')
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');

    // E. SHA256 加密並轉大寫
    return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
  }

  // 輔助：日期格式化
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