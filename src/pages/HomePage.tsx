import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, Search, Menu, X, Home, Heart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './HomePage.css';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice: number | null;
  image: string;
  category: string;
  rating: number;
  reviews: number;
  description: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  // 狀態管理
  const { cartCount, cartItems, addToCart, removeFromCart, updateQuantity } = useCart();  // ← 加這行
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [currentCategory, setCurrentCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://45.32.24.240/api/products/published');
      const data = await response.json();

      if (data.success) {
        const formattedProducts = data.products.map((product: any) => ({
          id: product.id,
          name: product.name,
          price: parseFloat(product.price),
          originalPrice: null,
          image: product.main_image || 'https://via.placeholder.com/400',  // ← 改這裡！
          category: getCategoryId(product.category_id),
          rating: 4.5,
          reviews: 0,
          description: product.description || '暫無描述'
        }));

        setProducts(formattedProducts);
      }
    } catch (error) {
      console.error('讀取商品失敗：', error);
    }
  };

  const getCategoryId = (categoryId: number): string => {
    const categoryMap: { [key: number]: string } = {
      1: 'clothing',
      2: 'electronics',
      3: 'food',
      4: 'accessories',
      5: 'home'
    };
    return categoryMap[categoryId] || 'clothing';
  };

  const categories = [
    { id: 'all', name: '全部商品' },
    { id: 'clothing', name: '服飾' },
    { id: 'electronics', name: '電子產品' },
    { id: 'food', name: '食品' },
    { id: 'accessories', name: '配件' },
    { id: 'home', name: '居家用品' }
  ];

  // 過濾商品
  const filteredProducts = products.filter(product => {
    const matchesCategory = currentCategory === 'all' || product.category === currentCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const toggleWishlist = (productId: number) => {
    setWishlist(prev =>
      prev.includes(productId) ? prev.filter(id => id !== productId) : [...prev, productId]
    );
  };

  const totalItems = cartCount;  // ← 直接用 Context 的 cartCount
  const totalPrice = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);  // ← 改用 cartItems

  return (
    <div className="home-page">
      {/* Header */}
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="logo">
              <h1>安鑫購物</h1>
            </div>

            <nav className="nav-desktop">
              <Link to="/" className="nav-link">首頁</Link>
              <Link to="/search" className="nav-link">搜尋</Link>
              <Link to="/wishlist" className="nav-link">最愛</Link>
              <Link to="/member" className="nav-link">會員</Link>
            </nav>

            <div className="search-bar">
              <div className="search-container">
                <Search className="search-icon" size={20} />
                <input
                  type="text"
                  placeholder="搜尋商品..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            <div className="header-actions">
              <button onClick={() => setIsCartOpen(true)} className="cart-button">
                <ShoppingCart size={24} />
                {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
              </button>

              <button onClick={() => setIsMobileMenuOpen(true)} className="mobile-menu-button">
                <Menu size={24} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="overlay" onClick={() => setIsMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <h2>選單</h2>
              <button onClick={() => setIsMobileMenuOpen(false)}>
                <X size={24} />
              </button>
            </div>
            <nav className="mobile-nav">
              <Link to="/" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>首頁</Link>
              <a href="#products" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>商品</a>
              <a href="#about" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>關於我們</a>
              <a href="#contact" className="mobile-nav-link" onClick={() => setIsMobileMenuOpen(false)}>聯絡我們</a>
            </nav>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-container">
          <h2 className="hero-title">發現你的完美商品</h2>
          <p className="hero-subtitle">精選商品,品質保證,快速配送</p>
          <button className="hero-button">立即購物</button>
        </div>
      </section>

      {/* Category Filter */}
      <section className="category-section" id="products">
        <div className="category-container">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setCurrentCategory(category.id)}
              className={`category-button ${currentCategory === category.id ? 'active' : ''}`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </section>

      {/* Products Grid */}
      <section className="products-section">
        <div className="products-grid">
          {filteredProducts.length === 0 ? (
            <div className="empty-products">
              <p>目前沒有商品,請從後台新增商品</p>
            </div>
          ) : (
            filteredProducts.map(product => (
              <div key={product.id} className="product-card">
                <div
                  className="product-image-container"
                  onClick={() => navigate(`/product/${product.id}`)}
                  style={{ cursor: 'pointer' }}
                >
                  <img src={product.image} alt={product.name} className="product-image" />
                  <button
                    onClick={() => toggleWishlist(product.id)}
                    className={`wishlist-button ${wishlist.includes(product.id) ? 'active' : ''}`}
                  >
                    ❤
                  </button>
                  {product.originalPrice && <div className="sale-badge">特價</div>}
                </div>

                <div className="product-info">
                  <h3
                    className="product-name"
                    onClick={() => navigate(`/product/${product.id}`)}
                    style={{ cursor: 'pointer' }}
                  >
                    {product.name}
                  </h3>
                  <p className="product-description">{product.description}</p>

                  <div className="product-rating">
                    <span>⭐ {product.rating} ({product.reviews})</span>
                  </div>

                  <div className="product-footer">
                    <div className="price-container">
                      <span className="price">NT$ {product.price.toLocaleString()}</span>
                      {product.originalPrice && (
                        <span className="original-price">
                          NT$ {product.originalPrice.toLocaleString()}
                        </span>
                      )}
                    </div>
                    <button onClick={() => addToCart(product.id, 1)} className="add-to-cart-button">
                      加入購物車
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Shopping Cart Sidebar */}
      {isCartOpen && (
        <div className="overlay" onClick={() => setIsCartOpen(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2>購物車 ({totalItems})</h2>
              <button onClick={() => setIsCartOpen(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="cart-items">
              {cartItems.length === 0 ? (
                <p className="empty-cart">購物車是空的</p>
              ) : (
                <div className="cart-items-list">
                  {cartItems.map(item => (
                    <div key={item.cart_item_id} className="cart-item">
                      <img src={item.image_url} alt={item.name} className="cart-item-image" />
                      <div className="cart-item-info">
                        <h4 className="cart-item-name">{item.name}</h4>
                        <p className="cart-item-price">NT$ {item.price.toLocaleString()}</p>
                        <div className="quantity-controls">
                          <button
                            onClick={() => updateQuantity(item.cart_item_id, item.quantity - 1)}
                            className="quantity-button"
                          >
                            -
                          </button>
                          <span className="quantity">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.cart_item_id, item.quantity + 1)}
                            className="quantity-button"
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <button onClick={() => removeFromCart(item.cart_item_id)} className="remove-button">
                        <X size={20} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span className="total-label">總計:</span>
                  <span className="total-price">NT$ {totalPrice.toLocaleString()}</span>
                </div>
                <button className="checkout-button">結帳</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-column">
              <h3 className="footer-title">ShopHub</h3>
              <p className="footer-text">提供最優質的商品與服務,打造完美的購物體驗。</p>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">快速連結</h4>
              <ul className="footer-links">
                <li><a href="#about">關於我們</a></li>
                <li><a href="#products">商品目錄</a></li>
                <li><a href="#contact">配送資訊</a></li>
                <li><a href="#contact">退換貨政策</a></li>
              </ul>
            </div>
            <div className="footer-column">
              <h4 className="footer-heading">客戶服務</h4>
              <ul className="footer-links">
                <li><a href="#contact">聯絡我們</a></li>
                <li><a href="#contact">常見問題</a></li>
                <li><a href="#contact">訂單查詢</a></li>
                <li><Link to="/member">會員中心</Link></li>
              </ul>
            </div>
            <div className="footer-column" id="contact">
              <h4 className="footer-heading">聯絡資訊</h4>
              <div className="footer-contact">
                <p>電話: (02) 1234-5678</p>
                <p>Email: info@shophub.com</p>
                <p>地址: 台北市信義區信義路五段7號</p>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ShopHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
      </div>
  );
}

      export default HomePage;