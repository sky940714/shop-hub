import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Home, ShoppingCart, Search, User, Trash2 } from 'lucide-react';
import './WishlistPage.css';

interface WishlistProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
  inStock: boolean;
}

const WishlistPage: React.FC = () => {
  const [wishlist, setWishlist] = useState<WishlistProduct[]>([
    {
      id: 1,
      name: '經典白色T恤',
      price: 890,
      originalPrice: 1200,
      image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400&h=400&fit=crop',
      category: 'clothing',
      rating: 4.5,
      inStock: true
    },
    {
      id: 2,
      name: '藍牙無線耳機',
      price: 2990,
      originalPrice: 3990,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop',
      category: 'electronics',
      rating: 4.8,
      inStock: true
    }
  ]);

  const removeFromWishlist = (productId: number) => {
    setWishlist(wishlist.filter(item => item.id !== productId));
  };

  const addToCart = (product: WishlistProduct) => {
    alert(`已將 ${product.name} 加入購物車`);
  };

  return (
    <div className="wishlist-page">
      {/* Header */}
      <header className="wishlist-header">
        <div className="wishlist-header-content">
          <Link to="/" className="back-button">← 返回</Link>
          <h1 className="wishlist-title">我的最愛</h1>
        </div>
      </header>

      {/* Main Container */}
      <div className="wishlist-container">
        {wishlist.length === 0 ? (
          <div className="empty-wishlist">
            <Heart size={64} className="empty-icon" />
            <h2>還沒有收藏的商品</h2>
            <p>快去逛逛,把喜歡的商品加入最愛吧!</p>
            <Link to="/" className="browse-button">
              開始購物
            </Link>
          </div>
        ) : (
          <>
            <div className="wishlist-info">
              <p>共 {wishlist.length} 件商品</p>
            </div>
            <div className="wishlist-grid">
              {wishlist.map(product => (
                <div key={product.id} className="wishlist-card">
                  <button
                    onClick={() => removeFromWishlist(product.id)}
                    className="remove-wishlist-btn"
                  >
                    <Trash2 size={20} />
                  </button>
                  
                  {!product.inStock && (
                    <div className="out-of-stock-badge">已售完</div>
                  )}

                  <img
                    src={product.image}
                    alt={product.name}
                    className="wishlist-product-image"
                  />

                  <div className="wishlist-product-info">
                    <h3 className="wishlist-product-name">{product.name}</h3>
                    
                    <div className="wishlist-product-rating">
                      ⭐ {product.rating}
                    </div>

                    <div className="wishlist-product-price">
                      <span className="price">NT$ {product.price.toLocaleString()}</span>
                      {product.originalPrice && (
                        <span className="original-price">
                          NT$ {product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => addToCart(product)}
                      className="add-to-cart-btn"
                      disabled={!product.inStock}
                    >
                      {product.inStock ? '加入購物車' : '已售完'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item">
          <Home size={24} />
          <span>首頁</span>
        </Link>
        <Link to="/wishlist" className="nav-item active">
          <Heart size={24} />
          <span>最愛</span>
        </Link>
        <Link to="/" className="nav-item">
          <ShoppingCart size={24} />
          <span>購物車</span>
        </Link>
        <Link to="/search" className="nav-item">
          <Search size={24} />
          <span>搜尋</span>
        </Link>
        <Link to="/member" className="nav-item">
          <User size={24} />
          <span>會員</span>
        </Link>
      </nav>
    </div>
  );
};

export default WishlistPage;