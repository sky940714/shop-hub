import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, X, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import BottomNav from '../components/BottomNav';
import './CartPage.css';

const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { cartItems, cartCount, removeFromCart, updateQuantity } = useCart();
  
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="cart-page">
      {/* Header */}
      <header className="cart-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={24} />
        </button>
        <h1>購物車 ({cartCount})</h1>
        <div style={{ width: 24 }}></div>
      </header>

      {/* Cart Content */}
      <div className="cart-content">
        {cartItems.length === 0 ? (
          <div className="empty-cart">
            <ShoppingCart size={64} className="empty-icon" />
            <h2>購物車是空的</h2>
            <p>快去逛逛，把喜歡的商品加入購物車吧！</p>
            <Link to="/" className="browse-btn">開始購物</Link>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cartItems.map(item => (
                <div key={item.cart_item_id} className="cart-item">
                  <img src={item.image_url} alt={item.name} className="item-image" />
                  <div className="item-info">
                    <h3 className="item-name">{item.name}</h3>
                    <p className="item-price">NT$ {item.price.toLocaleString()}</p>
                    <div className="quantity-controls">
                      <button
                        onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                        className="qty-btn"
                      >
                        -
                      </button>
                      <span className="qty-value">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                        className="qty-btn"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.cart_item_id)} 
                    className="remove-btn"
                  >
                    <X size={20} />
                  </button>
                </div>
              ))}
            </div>

            <div className="cart-summary">
              <div className="summary-row">
                <span>商品總計</span>
                <span>NT$ {totalPrice.toLocaleString()}</span>
              </div>
              <button 
                className="checkout-btn"
                onClick={() => navigate('/checkout')}
              >
                前往結帳
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav activePage="cart" />
    </div>
  );
};

export default CartPage;