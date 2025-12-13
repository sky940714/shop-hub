// src/pages/checkout/components/ShippingForm.tsx
import React from 'react';
import { Store, Truck, CreditCard, MapPin } from 'lucide-react';
import './styles/ShippingForm.css';

interface ShippingInfo {
  name: string;
  phone: string;
  email: string;
  address?: string;
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
}

interface ShippingFormProps {
  currentStep: number;
  shippingInfo: ShippingInfo;
  setShippingInfo: React.Dispatch<React.SetStateAction<ShippingInfo>>;
  shippingMethod: string;
  setShippingMethod: (method: string) => void;
  shippingSubType: string;
  setShippingSubType: (subType: string) => void;
  paymentMethod: string;
  setPaymentMethod: (method: string) => void;
  invoiceType: string;
  setInvoiceType: (type: string) => void;
  companyName: string;
  setCompanyName: (name: string) => void;
  taxId: string;
  setTaxId: (id: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSubmitOrder: () => void;
}

const ShippingForm: React.FC<ShippingFormProps> = ({
  currentStep,
  shippingInfo,
  setShippingInfo,
  shippingMethod,
  setShippingMethod,
  shippingSubType,
  setShippingSubType,
  paymentMethod,
  setPaymentMethod,
  invoiceType,
  setInvoiceType,
  companyName,
  setCompanyName,
  taxId,
  setTaxId,
  onNextStep,
  onPrevStep,
  onSubmitOrder,
}) => {
  // 處理收件資訊變更
  const handleInfoChange = (field: string, value: string) => {
    setShippingInfo(prev => ({ ...prev, [field]: value }));
  };

  // 選擇超商門市
  const handleSelectStore = async () => {
    // 防呆：確認有選超商類型
    if (!shippingSubType) {
      alert('請先選擇超商類型 (7-11/全家/萊爾富/OK)');
      return;
    }

    try {
      // 1. 呼叫後端取得地圖參數 (改用 GET)
      // 注意：這裡的 URL 必須對應你後端 routes 設定的 /api/ecpay/map
      const response = await fetch(`http://45.32.24.240/api/ecpay/map?logisticsSubType=${shippingSubType}`);
      
      if (!response.ok) throw new Error('Network response was not ok');
      const params = await response.json();

      // 2. 建立一個隱藏的表單 (Form)
      const form = document.createElement('form');
      form.method = 'POST';
      form.action = params.actionUrl; // 綠界的網址
      form.target = 'ECPayMapPopup';  // 指定目標視窗名稱

      // 3. 將後端回傳的參數填入 input
      Object.keys(params).forEach(key => {
        if (key !== 'actionUrl') {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = params[key];
          form.appendChild(input);
        }
      });

      // 必須將 form 加入 document 才能送出
      document.body.appendChild(form);

      // 4. 計算視窗位置並開啟彈跳視窗
      const width = 800;
      const height = 600;
      const left = (window.screen.width - width) / 2;
      const top = (window.screen.height - height) / 2;
      
      window.open(
        '', 
        'ECPayMapPopup', 
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );
      
      // 5. 送出表單到該視窗
      form.submit();
      
      // 6. 清理 DOM
      document.body.removeChild(form);

    } catch (error) {
      console.error('開啟門市地圖失敗:', error);
      alert('開啟門市地圖失敗，請稍後再試');
    }
  };

  return (
    <>
      {/* 步驟 1: 收件資訊 */}
      {currentStep === 1 && (
        <div className="form-section">
          <h2 className="section-title">收件資訊</h2>
          
          <div className="form-group">
            <label className="form-label">收件人姓名 *</label>
            <input
              type="text"
              className="form-input"
              placeholder="請輸入姓名"
              value={shippingInfo.name}
              onChange={(e) => handleInfoChange('name', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">手機號碼 *</label>
            <input
              type="tel"
              className="form-input"
              placeholder="09XXXXXXXX"
              value={shippingInfo.phone}
              onChange={(e) => handleInfoChange('phone', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              className="form-input"
              placeholder="example@email.com"
              value={shippingInfo.email}
              onChange={(e) => handleInfoChange('email', e.target.value)}
            />
          </div>

          <div className="form-actions">
            <button className="btn-next" onClick={onNextStep}>
              下一步
            </button>
          </div>
        </div>
      )}

      {/* 步驟 2: 配送方式 */}
      {currentStep === 2 && (
        <div className="form-section">
          <h2 className="section-title">配送方式</h2>

          {/* 配送方式選擇 */}
          <div className="shipping-methods">
            <div
              className={`shipping-option ${shippingMethod === 'cvs' ? 'selected' : ''}`}
              onClick={() => setShippingMethod('cvs')}
            >
              <input
                type="radio"
                name="shipping"
                checked={shippingMethod === 'cvs'}
                readOnly
              />
              <Store size={24} />
              <div className="option-info">
                <div className="option-title">超商取貨</div>
                <div className="option-desc">3-5個工作天送達門市</div>
              </div>
              <div className="option-price">NT$ 60</div>
            </div>

            <div
              className={`shipping-option ${shippingMethod === 'home' ? 'selected' : ''}`}
              onClick={() => setShippingMethod('home')}
            >
              <input
                type="radio"
                name="shipping"
                checked={shippingMethod === 'home'}
                readOnly
              />
              <Truck size={24} />
              <div className="option-info">
                <div className="option-title">宅配到府</div>
                <div className="option-desc">2-3個工作天送達</div>
              </div>
              <div className="option-price">NT$ 100</div>
            </div>
          </div>

          {/* 超商選擇 */}
          {shippingMethod === 'cvs' && (
            <div className="cvs-selection">
              <label className="form-label">選擇超商 *</label>
              <div className="cvs-options">
                <button
                  className={`cvs-btn ${shippingSubType === 'UNIMART' ? 'selected' : ''}`}
                  onClick={() => setShippingSubType('UNIMART')}
                >
                  7-ELEVEN
                </button>
                <button
                  className={`cvs-btn ${shippingSubType === 'FAMI' ? 'selected' : ''}`}
                  onClick={() => setShippingSubType('FAMI')}
                >
                  全家
                </button>
                <button
                  className={`cvs-btn ${shippingSubType === 'HILIFE' ? 'selected' : ''}`}
                  onClick={() => setShippingSubType('HILIFE')}
                >
                  萊爾富
                </button>
                <button
                  className={`cvs-btn ${shippingSubType === 'OKMART' ? 'selected' : ''}`}
                  onClick={() => setShippingSubType('OKMART')}
                >
                  OK超商
                </button>
              </div>

              {shippingSubType && (
                <div className="store-selector">
                  <button type="button" className="select-store-btn" onClick={handleSelectStore}>
                    <MapPin size={20} />
                    {shippingInfo.storeId ? '變更門市' : '選擇門市'}
                  </button>
                  {shippingInfo.storeId && (
                    <div className="selected-store">
                      <div className="store-name">{shippingInfo.storeName}</div>
                      <div className="store-address">{shippingInfo.storeAddress}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 宅配地址 */}
          {shippingMethod === 'home' && (
            <div className="form-group">
              <label className="form-label">收件地址 *</label>
              <input
                type="text"
                className="form-input"
                placeholder="請輸入完整地址 (含縣市、區域、街道、門牌號碼)"
                value={shippingInfo.address || ''}
                onChange={(e) => handleInfoChange('address', e.target.value)}
              />
            </div>
          )}

          <div className="form-actions">
            <button className="btn-prev" onClick={onPrevStep}>
              上一步
            </button>
            <button className="btn-next" onClick={onNextStep}>
              下一步
            </button>
          </div>
        </div>
      )}

      {/* 步驟 3: 付款方式 */}
      {currentStep === 3 && (
        <div className="form-section">
          <h2 className="section-title">付款方式</h2>

          <div className="payment-methods">
            {shippingMethod === 'cvs' && (
              <div
                className={`payment-option ${paymentMethod === 'cod' ? 'selected' : ''}`}
                onClick={() => setPaymentMethod('cod')}
              >
                <input
                  type="radio"
                  name="payment"
                  checked={paymentMethod === 'cod'}
                  readOnly
                />
                <Store size={24} />
                <div className="option-info">
                  <div className="option-title">超商取貨付款</div>
                  <div className="option-desc">取貨時付現金</div>
                </div>
              </div>
            )}

            <div
              className={`payment-option ${paymentMethod === 'Credit' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('Credit')}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'Credit'}
                readOnly
              />
              <CreditCard size={24} />
              <div className="option-info">
                <div className="option-title">信用卡</div>
                <div className="option-desc">Visa, MasterCard, JCB</div>
              </div>
            </div>

            <div
              className={`payment-option ${paymentMethod === 'ATM' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('ATM')}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'ATM'}
                readOnly
              />
              <div className="payment-icon">ATM</div>
              <div className="option-info">
                <div className="option-title">ATM 虛擬帳號</div>
                <div className="option-desc">取得繳費帳號後轉帳</div>
              </div>
            </div>

            <div
              className={`payment-option ${paymentMethod === 'CVS' ? 'selected' : ''}`}
              onClick={() => setPaymentMethod('CVS')}
            >
              <input
                type="radio"
                name="payment"
                checked={paymentMethod === 'CVS'}
                readOnly
              />
              <Store size={24} />
              <div className="option-info">
                <div className="option-title">超商代碼繳費</div>
                <div className="option-desc">取得繳費代碼後至超商繳費</div>
              </div>
            </div>
          </div>

          {/* 發票資訊 */}
          <div className="invoice-section">
            <h3 className="subsection-title">發票資訊</h3>
            
            <div className="invoice-types">
              <label className="radio-label">
                <input
                  type="radio"
                  name="invoice"
                  checked={invoiceType === 'personal'}
                  onChange={() => setInvoiceType('personal')}
                />
                個人電子發票
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="invoice"
                  checked={invoiceType === 'company'}
                  onChange={() => setInvoiceType('company')}
                />
                公司戶發票
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="invoice"
                  checked={invoiceType === 'donate'}
                  onChange={() => setInvoiceType('donate')}
                />
                捐贈發票
              </label>
            </div>

            {invoiceType === 'company' && (
              <div className="company-invoice">
                <div className="form-group">
                  <label className="form-label">公司抬頭 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="請輸入公司名稱"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">統一編號 *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="請輸入8位數統編"
                    maxLength={8}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            <button className="btn-prev" onClick={onPrevStep}>
              上一步
            </button>
            <button className="btn-next" onClick={onNextStep}>
              下一步
            </button>
          </div>
        </div>
      )}

      {/* 步驟 4: 確認訂單 */}
      {currentStep === 4 && (
        <div className="form-section">
          <h2 className="section-title">確認訂單</h2>

          <div className="order-confirm">
            <div className="confirm-section">
              <h3 className="confirm-title">收件資訊</h3>
              <div className="confirm-content">
                <p><strong>姓名:</strong> {shippingInfo.name}</p>
                <p><strong>電話:</strong> {shippingInfo.phone}</p>
                <p><strong>Email:</strong> {shippingInfo.email}</p>
              </div>
            </div>

            <div className="confirm-section">
              <h3 className="confirm-title">配送方式</h3>
              <div className="confirm-content">
                {shippingMethod === 'cvs' ? (
                  <>
                    <p><strong>配送方式:</strong> 超商取貨</p>
                    <p><strong>超商:</strong> {
                      shippingSubType === 'UNIMART' ? '7-ELEVEN' :
                      shippingSubType === 'FAMI' ? '全家' :
                      shippingSubType === 'HILIFE' ? '萊爾富' :
                      shippingSubType === 'OKMART' ? 'OK超商' : ''
                    }</p>
                    <p><strong>門市:</strong> {shippingInfo.storeName}</p>
                    <p><strong>地址:</strong> {shippingInfo.storeAddress}</p>
                  </>
                ) : (
                  <>
                    <p><strong>配送方式:</strong> 宅配到府</p>
                    <p><strong>地址:</strong> {shippingInfo.address}</p>
                  </>
                )}
              </div>
            </div>

            <div className="confirm-section">
              <h3 className="confirm-title">付款方式</h3>
              <div className="confirm-content">
                <p>
                  {paymentMethod === 'cod' && '超商取貨付款'}
                  {paymentMethod === 'Credit' && '信用卡'}
                  {paymentMethod === 'ATM' && 'ATM 虛擬帳號'}
                  {paymentMethod === 'CVS' && '超商代碼繳費'}
                </p>
              </div>
            </div>

            <div className="confirm-section">
              <h3 className="confirm-title">發票資訊</h3>
              <div className="confirm-content">
                {invoiceType === 'personal' && <p>個人電子發票</p>}
                {invoiceType === 'company' && (
                  <>
                    <p><strong>公司抬頭:</strong> {companyName}</p>
                    <p><strong>統一編號:</strong> {taxId}</p>
                  </>
                )}
                {invoiceType === 'donate' && <p>捐贈發票</p>}
              </div>
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-prev" onClick={onPrevStep}>
              上一步
            </button>
            <button className="btn-submit" onClick={onSubmitOrder}>
              確認送出訂單
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ShippingForm;