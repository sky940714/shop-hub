// backend/utils/ecpay.js
const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    this.merchantId = '2000132';
    this.hashKey = '5294y06JbISpM5x9';
    this.hashIv = 'v77hoKGq4kWxNNIS';
  }

  // 1. 金流參數 (維持 SHA256)
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

    // 金流使用 SHA256
    params.CheckMacValue = this.generateCheckMacValue(params, 'sha256');
    
    return { ...params, actionUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5' };
  }

  // 2. 驗證檢查碼 (金流用 SHA256)
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params, 'sha256');
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 地圖參數 (物流地圖通常不檢查 MacValue，但若要檢查可用 MD5)
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

  // 4. [重點修正] 物流訂單參數
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';
    const storeID = order.store_id || '991182'; 

    // 過濾姓名
    let cleanName = (order.receiver_name || '測試收件人').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    if (!cleanName) cleanName = 'Customer';
    if (cleanName.length > 10) cleanName = cleanName.substring(0, 10);

    console.log('物流訂單姓名:', cleanName);

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
      SenderName: '測試賣家', // 改回中文，避免英文長度問題
      SenderCellPhone: '0912345678',
      ReceiverName: cleanName,
      ReceiverCellPhone: order.receiver_phone || '0912345678',
      ReceiverEmail: order.receiver_email || '', 
      ReceiverStoreID: storeID, 
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/logistics-callback`,
    };

    // ★ 關鍵修正：物流 API 強制使用 MD5
    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');
    return params;
  }

  // 5. 列印 HTML (物流用 MD5)
  getPrintHtml(allPayLogisticsID) {
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: allPayLogisticsID,
    };
    // ★ 關鍵修正：物流 API 強制使用 MD5
    params.CheckMacValue = this.generateCheckMacValue(params, 'md5');

    return `
      <form id="printForm" action="https://logistics-stage.ecpay.com.tw/Helper/PrintTradeDocument" method="POST">
        <input type="hidden" name="MerchantID" value="${params.MerchantID}" />
        <input type="hidden" name="AllPayLogisticsID" value="${params.AllPayLogisticsID}" />
        <input type="hidden" name="CheckMacValue" value="${params.CheckMacValue}" />
      </form>
      <script>document.getElementById("printForm").submit();</script>
    `;
  }

  // 6. [核心修正] 加密邏輯：支援 algorithm 參數切換
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

    // 根據傳入的演算法決定使用 sha256 還是 md5
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