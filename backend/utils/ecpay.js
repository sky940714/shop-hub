const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 測試環境參數 (固定值)
    this.merchantId = '2000132';
    this.hashKey = '5294y06JbISpM5x9';
    this.hashIv = 'v77hoKGq4kWxNNIS';
  }

  // 1. 金流：產生給綠界的表單參數
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
      ReturnURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/callback`,
      ClientBackURL: `${process.env.CLIENT_URL || 'http://45.32.24.240'}/order/result`,
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    params.CheckMacValue = this.generateCheckMacValue(params);
    return {
      ...params,
      actionUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5'
    };
  }

  // 2. 金流：驗證綠界回傳的檢查碼
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params);
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 物流：產生電子地圖參數
  getMapParams(logisticsSubType) {
    return {
      MerchantID: this.merchantId,
      LogisticsType: 'CVS',
      LogisticsSubType: logisticsSubType || 'UNIMART',
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/map-callback`,
      IsCollection: 'N',
      actionUrl: 'https://logistics-stage.ecpay.com.tw/Express/map'
    };
  }

  // 4. [修正重點] 物流：產生「建立物流訂單」的參數
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    
    // 判斷是否為貨到付款 (COD)
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';

    // 確保 ReceiverStoreID 有值，如果是測試可以用假門市
    // 注意：如果 store_id 是 null，這裡會報錯，所以加個防呆
    const storeID = order.store_id || '991182'; // 991182 是 7-11 統測門市 (測試用)

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
      SenderName: '測試賣家',
      SenderCellPhone: '0912345678',
      ReceiverName: order.receiver_name || '測試收件人',
      ReceiverCellPhone: order.receiver_phone || '0912345678',
      ReceiverEmail: order.receiver_email || '', // Email 允許為空字串
      ReceiverStoreID: storeID, 
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/logistics-callback`,
    };

    params.CheckMacValue = this.generateCheckMacValue(params);
    return params;
  }

  // 5. 物流：產生「列印託運單」的 HTML
  getPrintHtml(allPayLogisticsID) {
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: allPayLogisticsID,
    };
    params.CheckMacValue = this.generateCheckMacValue(params);

    return `
      <form id="printForm" action="https://logistics-stage.ecpay.com.tw/Helper/PrintTradeDocument" method="POST">
        <input type="hidden" name="MerchantID" value="${params.MerchantID}" />
        <input type="hidden" name="AllPayLogisticsID" value="${params.AllPayLogisticsID}" />
        <input type="hidden" name="CheckMacValue" value="${params.CheckMacValue}" />
      </form>
      <script>document.getElementById("printForm").submit();</script>
    `;
  }

  // 核心：加密邏輯 (針對物流優化)
  generateCheckMacValue(params) {
    const rawParams = { ...params };
    delete rawParams.CheckMacValue;

    // 1. 依照 Key 排序
    const keys = Object.keys(rawParams).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    
    // 2. 組成字串
    let raw = keys.map(k => `${k}=${rawParams[k]}`).join('&');
    
    // 3. 前後加 Key/IV
    raw = `HashKey=${this.hashKey}&${raw}&HashIV=${this.hashIv}`;

    // 4. URL Encode
    let encoded = encodeURIComponent(raw).toLowerCase();

    // 5. 綠界特殊符號置換 (這一步最關鍵)
    encoded = encoded
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')')
      .replace(/%20/g, '+'); // 空格要轉成 +

    // 6. SHA256 加密並轉大寫
    return crypto.createHash('sha256').update(encoded).digest('hex').toUpperCase();
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