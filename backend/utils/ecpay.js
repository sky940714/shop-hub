const crypto = require('crypto');

class ECPayUtils {
  constructor() {
    this.merchantId = '2000132';
    this.hashKey = '5294y06JbISpM5x9';
    this.hashIv = 'v77hoKGq4kWxNNIS';
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
      ReturnURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/callback`,
      ClientBackURL: `${process.env.CLIENT_URL || 'http://45.32.24.240'}/order/result`,
      ChoosePayment: 'ALL',
      EncryptType: '1',
    };

    params.CheckMacValue = this.generateCheckMacValue(params);
    return { ...params, actionUrl: 'https://payment-stage.ecpay.com.tw/Cashier/AioCheckOut/V5' };
  }

  // 2. 驗證檢查碼
  verifyCheckMacValue(params) {
    const receivedCheckMacValue = params.CheckMacValue;
    const calculatedCheckMacValue = this.generateCheckMacValue(params);
    return receivedCheckMacValue === calculatedCheckMacValue;
  }

  // 3. 地圖參數
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

  // 4. [除錯重點] 物流參數：加入 Log 與強力過濾
  getLogisticsCreateParams(order) {
    const tradeDate = this.formatDate(new Date());
    const amount = Math.round(order.total).toString();
    const isCollection = order.payment_method === 'cod';
    const collectionAmount = isCollection ? amount : '0';
    const storeID = order.store_id || '991182'; 

    // 原始姓名
    const originalName = order.receiver_name || '';
    
    // 強力過濾：只保留 中文、英文、數字 (連空格都拿掉)
    let cleanName = originalName.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
    
    // 若過濾後變空字串(例如原本全是符號)，就給個預設值
    if (!cleanName) cleanName = 'Customer';
    
    // 長度限制 10 字
    if (cleanName.length > 10) cleanName = cleanName.substring(0, 10);

    // ★ 照妖鏡：印出來看看發生什麼事
    console.log('------------------------------------------------');
    console.log('物流訂單姓名檢查:');
    console.log('原始姓名:', originalName);
    console.log('過濾後姓名:', cleanName);
    console.log('------------------------------------------------');

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
      SenderName: 'ShopHub',
      SenderCellPhone: '0912345678',
      ReceiverName: cleanName, // 使用過濾後的姓名
      ReceiverCellPhone: order.receiver_phone || '0912345678',
      ReceiverEmail: order.receiver_email || '', 
      ReceiverStoreID: storeID, 
      ServerReplyURL: `${process.env.SERVER_URL || 'http://45.32.24.240'}/api/ecpay/logistics-callback`,
    };

    params.CheckMacValue = this.generateCheckMacValue(params);
    return params;
  }

  // 5. 列印 HTML
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

  // 6. 加密邏輯
  generateCheckMacValue(params) {
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