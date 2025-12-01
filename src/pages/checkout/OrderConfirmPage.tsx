// src/pages/checkout/OrderConfirmPage.tsx
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import '../../styles/OrderConfirmPage.css';

const OrderConfirmPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const orderData = location.state;

  if (!orderData) {
    return (
      <div className="order-confirm-page">
        <div className="error-message">
          <p>找不到訂單資料</p>
          <button onClick={() => navigate('/')} className="back-btn">
            返回首頁
          </button>
        </div>
      </div>
    );
  }

  const handleConfirm = () => {
    // 這裡可以導向付款頁面或完成訂單
    navigate('/checkout/order-success');
  };

  return (
    <div className="order-confirm-page">
      <button className="back-button" onClick={() => navigate(-1)}>
        <ArrowLeft size={20} />
        返回修改
      </button>

      <div className="confirm-container">
        <h1 className="confirm-title">確認訂單資訊</h1>
        <p className="confirm-subtitle">請確認以下資訊無誤後送出訂單</p>

        {/* 這裡可以顯示訂單詳細資訊 */}
        
        <div className="confirm-actions">
          <button className="btn-cancel" onClick={() => navigate(-1)}>
            返回修改
          </button>
          <button className="btn-confirm" onClick={handleConfirm}>
            確認送出
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderConfirmPage;