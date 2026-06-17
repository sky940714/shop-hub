// src/pages/checkout/components/OrderSummary.tsx
import React from 'react';
import './styles/OrderSummary.css';

interface CartItem {
  cart_item_id: number;
  product_id: number;
  name: string;
  price: number;
  quantity: number;
  image_url: string;
}

interface OrderSummaryProps {
  cartItems: CartItem[];
  subtotal: number;
  shippingFee: number;
  total: number;
  shippingMethod: string;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({
  cartItems,
  subtotal,
  shippingFee,
  total,
  shippingMethod,
}) => {
  return (
    <div className="order-summary">
      <h3 className="summary-title">訂單摘要</h3>

      <div className="summary-items">
        {cartItems.map((item) => (
          <div key={item.cart_item_id} className="summary-item">
            <img src={item.image_url} alt={item.name} className="item-image" loading="lazy" decoding="async" />
            <div className="item-info">
              <div className="item-name">{item.name}</div>
              <div className="item-quantity">x {item.quantity}</div>
            </div>
            <div className="item-price">
              NT$ {(item.price * item.quantity).toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      <div className="summary-details">
        <div className="detail-row">
          <span>小計</span>
          <span>NT$ {subtotal.toLocaleString()}</span>
        </div>
        <div className="detail-row">
          <span>運費</span>
          <span>
            {shippingFee === 0 && shippingMethod ? (
              <span style={{ color: '#10b981' }}>免運費</span>
            ) : (
              `NT$ ${shippingFee.toLocaleString()}`
            )}
          </span>
        </div>

        {/* 免運提示 */}
        {shippingMethod === 'cvs' && subtotal < 500 && (
          <div className="free-shipping-hint">
            🚚 再買 NT$ {(500 - subtotal).toLocaleString()} 即享超商免運
          </div>
        )}
        {shippingMethod === 'home' && subtotal < 1000 && (
          <div className="free-shipping-hint">
            🚚 再買 NT$ {(1000 - subtotal).toLocaleString()} 即享宅配免運
          </div>
        )}
        {shippingFee === 0 && shippingMethod && shippingMethod !== 'pickup' && (
          <div className="free-shipping-success">
            ✅ 已享免運優惠
          </div>
        )}
        <div className="detail-row total">
          <span>總計</span>
          <span className="total-amount">NT$ {total.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default OrderSummary;