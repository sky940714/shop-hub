// src/pages/ProductDetailPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Star } from 'lucide-react';
import './ProductDetailPage.css';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  image_url: string;
  category_id: number;
  status: string;
  category_name?: string;
  images?: Array<{
    id: number;
    product_id: number;
    image_url: string;
    sort_order: number;
    is_main: number;
  }>;
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        const response = await fetch(`http://45.32.24.240:5001/api/products/${id}`);
        const data = await response.json();

        if (data.success) {
          setProduct(data.product);
        }
      } catch (error) {
        console.error('讀取商品失敗：', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  const handleAddToCart = () => {
    if (!product) return;
    
    const existingCart = JSON.parse(localStorage.getItem('cart') || '[]');
    const existingItem = existingCart.find((item: any) => item.id === product.id);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      existingCart.push({
        id: product.id,
        name: product.name,
        price: product.price,
        image: product.image_url,
        quantity: quantity
      });
    }
    
    localStorage.setItem('cart', JSON.stringify(existingCart));
    alert('已加入購物車！');
  };

  const increaseQuantity = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const decreaseQuantity = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">載入中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-container">
        <div className="error">找不到商品</div>
        <button onClick={() => navigate('/')} className="back-home-btn">
          返回首頁
        </button>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      <button className="back-button" onClick={() => navigate('/')}>
        <ArrowLeft size={20} />
        返回
      </button>

      <div className="product-detail-container">
        <div className="product-image-section">
          <img 
  src={
    product.images && product.images.length > 0 
      ? product.images[0].image_url 
      : 'https://via.placeholder.com/500'
  } 
  alt={product.name}
  className="main-product-image"
/>
        </div>

        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>

          <div className="rating-section">
            <div className="stars">
              <Star fill="#fbbf24" color="#fbbf24" size={20} />
              <span className="rating-text">4.5</span>
            </div>
            <span className="divider">|</span>
            <span className="sales-text">已售出 {product.stock > 100 ? '100+' : product.stock}</span>
          </div>

          <div className="price-section">
            <span className="price-label">NT$</span>
            <span className="price-value">{product.price.toLocaleString()}</span>
          </div>

          <div className="description-section">
            <h3 className="section-title">商品描述</h3>
            <p className="description-text">
              {product.description || '暫無描述'}
            </p>
          </div>

          <div className="stock-section">
            <span className="stock-label">庫存：</span>
            <span className="stock-value">{product.stock} 件</span>
          </div>

          <div className="quantity-section">
            <span className="quantity-label">數量：</span>
            <div className="quantity-controls">
              <button 
                className="quantity-button"
                onClick={decreaseQuantity}
                disabled={quantity <= 1}
              >
                -
              </button>
              <input 
                type="number" 
                value={quantity}
                readOnly
                className="quantity-input"
              />
              <button 
                className="quantity-button"
                onClick={increaseQuantity}
                disabled={quantity >= product.stock}
              >
                +
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              <ShoppingCart size={20} />
              加入購物車
            </button>
            <button className="buy-now-btn">
              立即購買
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;