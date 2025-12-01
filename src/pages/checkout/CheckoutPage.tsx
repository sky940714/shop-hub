// src/pages/checkout/CheckoutPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { ArrowLeft } from 'lucide-react';
import StepIndicator from './components/StepIndicator';
import ShippingForm from './components/ShippingForm';
import OrderSummary from './components/OrderSummary';
import './styles/CheckoutPage.css';

interface ShippingInfo {
  name: string;
  phone: string;
  email: string;
  address?: string;
  storeId?: string;
  storeName?: string;
  storeAddress?: string;
}

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, clearCart } = useCart();

  // 步驟控制
  const [currentStep, setCurrentStep] = useState(1);

  // 收件資訊
  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    name: '',
    phone: '',
    email: '',
  });

  // 配送方式
  const [shippingMethod, setShippingMethod] = useState<string>('');
  const [shippingSubType, setShippingSubType] = useState<string>('');

  // 付款方式
  const [paymentMethod, setPaymentMethod] = useState<string>('');

  // 發票資訊
  const [invoiceType, setInvoiceType] = useState<string>('personal');
  const [companyName, setCompanyName] = useState<string>('');
  const [taxId, setTaxId] = useState<string>('');

  // 計算金額
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingFee = getShippingFee();
  const total = subtotal + shippingFee;

  // 取得運費
  function getShippingFee(): number {
    if (!shippingMethod) return 0;
    if (shippingMethod === 'cvs') return 60;
    if (shippingMethod === 'home') return 100;
    return 0;
  }

  // 監聽綠界門市選擇回傳
  useEffect(() => {
    const handleStoreCallback = (event: MessageEvent) => {
      if (event.data && event.data.storeId) {
        setShippingInfo(prev => ({
          ...prev,
          storeId: event.data.storeId,
          storeName: event.data.storeName,
          storeAddress: event.data.storeAddress,
        }));
      }
    };

    window.addEventListener('message', handleStoreCallback);
    return () => window.removeEventListener('message', handleStoreCallback);
  }, []);

  // 如果購物車是空的
  if (cartItems.length === 0) {
    return (
      <div className="checkout-page">
        <div className="empty-cart-message">
          <p>購物車是空的</p>
          <button onClick={() => navigate('/')} className="back-home-button">
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  // 驗證步驟
  const validateStep = (step: number): boolean => {
    if (step === 1) {
      if (!shippingInfo.name || !shippingInfo.phone || !shippingInfo.email) {
        alert('請填寫完整收件資訊');
        return false;
      }
      const phoneRegex = /^09\d{8}$/;
      if (!phoneRegex.test(shippingInfo.phone)) {
        alert('請輸入正確的手機號碼格式 (例: 0912345678)');
        return false;
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(shippingInfo.email)) {
        alert('請輸入正確的 Email 格式');
        return false;
      }
    }

    if (step === 2) {
      if (!shippingMethod) {
        alert('請選擇配送方式');
        return false;
      }
      if (shippingMethod === 'cvs' && !shippingSubType) {
        alert('請選擇超商');
        return false;
      }
      if (shippingMethod === 'cvs' && !shippingInfo.storeId) {
        alert('請選擇取貨門市');
        return false;
      }
      if (shippingMethod === 'home' && !shippingInfo.address) {
        alert('請填寫收件地址');
        return false;
      }
    }

    if (step === 3) {
      if (!paymentMethod) {
        alert('請選擇付款方式');
        return false;
      }
      if (invoiceType === 'company' && (!companyName || !taxId)) {
        alert('請填寫公司抬頭和統一編號');
        return false;
      }
    }

    return true;
  };

  // 下一步
  const handleNextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(currentStep + 1);
    }
  };

  // 上一步
  const handlePrevStep = () => {
    setCurrentStep(currentStep - 1);
  };

  // 提交訂單
  const handleSubmitOrder = async () => {
    if (!validateStep(3)) return;

    try {
      const token = localStorage.getItem('token');
      
      const orderData = {
        shippingInfo,
        shippingMethod,
        shippingSubType,
        paymentMethod,
        invoiceType,
        companyName,
        taxId,
        subtotal,
        shippingFee,
        total,
        items: cartItems,
      };

      const response = await fetch('http://45.32.24.240/api/orders/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(orderData),
      });

      const data = await response.json();

      if (data.success) {
        // 清空購物車
        clearCart();
        
        // 如果是線上付款,導向綠界付款頁面
        if (paymentMethod !== 'cod') {
          window.location.href = data.paymentUrl;
        } else {
          // 取貨付款直接完成
          navigate(`/checkout/order-success/${data.orderNo}`);
        }
      } else {
        alert(data.message || '建立訂單失敗');
      }
    } catch (error) {
      console.error('建立訂單失敗:', error);
      alert('建立訂單失敗,請稍後再試');
    }
  };

  return (
    <div className="checkout-page">
      {/* 返回按鈕 */}
      <button className="back-button" onClick={() => navigate('/cart')}>
        <ArrowLeft size={20} />
        返回購物車
      </button>

      {/* 步驟指示器 */}
      <StepIndicator currentStep={currentStep} />

      <div className="checkout-content">
        {/* 左側:表單區域 */}
        <div className="checkout-form">
          <ShippingForm
            currentStep={currentStep}
            shippingInfo={shippingInfo}
            setShippingInfo={setShippingInfo}
            shippingMethod={shippingMethod}
            setShippingMethod={setShippingMethod}
            shippingSubType={shippingSubType}
            setShippingSubType={setShippingSubType}
            paymentMethod={paymentMethod}
            setPaymentMethod={setPaymentMethod}
            invoiceType={invoiceType}
            setInvoiceType={setInvoiceType}
            companyName={companyName}
            setCompanyName={setCompanyName}
            taxId={taxId}
            setTaxId={setTaxId}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onSubmitOrder={handleSubmitOrder}
          />
        </div>

        {/* 右側:訂單摘要 */}
        <OrderSummary
          cartItems={cartItems}
          subtotal={subtotal}
          shippingFee={shippingFee}
          total={total}
        />
      </div>
    </div>
  );
};

export default CheckoutPage;