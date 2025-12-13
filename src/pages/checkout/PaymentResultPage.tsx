// src/pages/checkout/PaymentResultPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentResultPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div style={{ textAlign: 'center', padding: '50px' }}>
      <h1 style={{ color: 'green' }}>🎉 付款成功！</h1>
      <p>感謝您的購買，我們已收到您的訂單。</p>
      <button 
        onClick={() => navigate('/member/orders')} // 或是導向首頁 '/'
        style={{ padding: '10px 20px', marginTop: '20px', cursor: 'pointer' }}
      >
        查看我的訂單
      </button>
    </div>
  );
};

export default PaymentResultPage;