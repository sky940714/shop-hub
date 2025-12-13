const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    // 測試環境參數 (固定值)
    this.merchantId = '2000132';
    this.hashKey = '5294y06JbISpM5x9';
    this.hashIv = 'v77hoKGq4kWxNNIS';
  }

  // 1. 金流：產生給綠界的表單參數 (消費者付款用)
  getParams(order) {
    // 將資料庫的 created_at 轉為綠界要的格式
    const tradeDate = this.formatDate(new Date()); 
    // 將金額轉為整數字串
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

  // 2. 金流：驗證綠界回傳的檢查碼 (用於 callback)
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params);
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 物流：產生電子地圖參數 (選門市用)
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

  // ==========================================
  // 4. [新增] 物流：產生「建立物流訂單」的參數 (後台出貨用)
  // ==========================================
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    
    // 判斷是否為貨到付款 (COD)
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';

    const params = {
      MerchantID: this.merchantId,
      MerchantTradeNo: order.order_no + 'L', // 物流訂單號通常跟金流分開，這裡加個 'L' 避免重複
      MerchantTradeDate: tradeDate,
      LogisticsType: 'CVS',
      LogisticsSubType: order.shipping_sub_type || 'UNIMART',
      GoodsAmount: amount,
      CollectionAmount: collectionAmount, 
      IsCollection: isCollection ? 'Y' : 'N',
      GoodsName: 'ShopHub商品',
      SenderName: '測試賣家',
      SenderCellPhone: '0912345678',
      ReceiverName: order.receiver_name,
      ReceiverCellPhone: order.receiver_phone,
      ReceiverEmail: order.receiver_email || '',
      ReceiverStoreID: order.store_id, // ★ 關鍵：這就是消費者選的那家店
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/logistics-callback`,
    };

    // 計算檢查碼
    params.CheckMacValue = this.generateCheckMacValue(params);
    return params;
  }

  // ==========================================
  // 5. [新增] 物流：產生「列印託運單」的 HTML (列印用)
  // ==========================================
  getPrintHtml(allPayLogisticsID) {
    const params = {
      MerchantID: this.merchantId,
      AllPayLogisticsID: allPayLogisticsID,
    };
    params.CheckMacValue = this.generateCheckMacValue(params);

    // 回傳一段 HTML，瀏覽器打開後會自動 POST 到綠界列印頁面
    return `
      <form id="printForm" action="https://logistics-stage.ecpay.com.tw/Helper/PrintTradeDocument" method="POST">
        <input type="hidden" name="MerchantID" value="${params.MerchantID}" />
        <input type="hidden" name="AllPayLogisticsID" value="${params.AllPayLogisticsID}" />
        <input type="hidden" name="CheckMacValue" value="${params.CheckMacValue}" />
      </form>
      <script>document.getElementById("printForm").submit();</script>
    `;
  }

  // 核心：加密邏輯
  generateCheckMacValue(params) {
    const rawParams = { ...params };
    delete rawParams.CheckMacValue;

    const keys = Object.keys(rawParams).sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));

    let raw = keys.map(k => `${k}=${rawParams[k]}`).join('&');
    
    raw = `HashKey=${this.hashKey}&${raw}&HashIV=${this.hashIv}`;

    let encoded = encodeURIComponent(raw).toLowerCase()
      .replace(/%20/g, '+')
      .replace(/%2d/g, '-')
      .replace(/%5f/g, '_')
      .replace(/%2e/g, '.')
      .replace(/%21/g, '!')
      .replace(/%2a/g, '*')
      .replace(/%28/g, '(')
      .replace(/%29/g, ')');

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