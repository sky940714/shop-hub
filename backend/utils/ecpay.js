// backend/utils/ecpay.js
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 1. 改成讀取 .env 的正式金鑰 (如果沒設定才用測試值)
    this.merchantId = process.env.ECPAY_MERCHANT_ID || '2000132';
    this.hashKey = process.env.ECPAY_HASH_KEY || '5294y06JbISpM5x9';
    this.hashIv = process.env.ECPAY_HASH_IV || 'v77hoKGq4kWxNNIS';
    
    // 判斷是否為正式環境 (用 MerchantID 是否為測試帳號來判斷)
    this.isProduction = this.merchantId !== '2000132';
  }

  // 輔助：取得正確的 API 網址 (自動切換 正式/測試)
  getApiUrl(type) {
    if (this.isProduction) {
      // ✅ 正式環境 (沒有 -stage)
      if (type === 'payment') return 'https://payment.ecpay.com.tw/Cashier/AioCheckOut/V5';
      if (type === 'map') return 'https://logistics.ecpay.com.tw/Express/map';
      if (type === 'create') return 'https://logistics.ecpay.com.tw/Express/Create';
      if (type === 'print') return 'https://logistics.ecpay.com.tw/Helper/PrintTradeDocument';
    } else {
      // 🚧 測試環境 (有 -stage)
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
      ReturnURL: `${process.env.SERVER_URL}/api/ecpay/callback`,
      ClientBackURL: `${process.env.CLIENT_URL}/order/result`,
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    params.CheckMacValue = this.generateCheckMacValue(params, 'sha256');
    
    // 使用動態網址
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
      LogisticsSubType: logisticsSubType || 'UNIMART',
      ServerReplyURL: `${process.env.SERVER_URL}/api/ecpay/map-callback`,
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
      LogisticsSubType: order.shipping_sub_type || 'UNIMART',
      GoodsAmount: amount,
      CollectionAmount: collectionAmount, 
      IsCollection: isCollection ? 'Y' : 'N',
      GoodsName: 'ShopHub商品',
      SenderName: 'ShopHub', // 正式環境建議用英文
      SenderCellPhone: '0912345678', // 建議改成你的真實電話
      ReceiverName: cleanName,
      ReceiverCellPhone: order.receiver_phone || '0912345678',
      ReceiverEmail: order.receiver_email || '', 
      ReceiverStoreID: storeID, 
      ServerReplyURL: `${process.env.SERVER_URL}/api/ecpay/logistics-callback`,
    };

    // 物流 API 強制使用 MD5
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