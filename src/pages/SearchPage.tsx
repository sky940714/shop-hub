import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, Heart, ShoppingCart, User, X, TrendingUp } from 'lucide-react';
import './SearchPage.css';

interface Product {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
}

const SearchPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults] = useState<Product[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([
    '白色T恤',
    '藍牙耳機',
    '咖啡豆'
  ]);

  const hotKeywords = ['特價商品', '新品上市', '熱銷排行', '限時優惠'];

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  const handleSearch = (keyword: string) => {
    setSearchTerm(keyword);
    if (!recentSearches.includes(keyword)) {
      setRecentSearches([keyword, ...recentSearches.slice(0, 4)]);
    }
  };

  const removeRecentSearch = (keyword: string) => {
    setRecentSearches(recentSearches.filter(item => item !== keyword));
  };

  return (
    <div className="search-page">
      {/* Header */}
      <header className="search-header">
        <div className="search-header-content">
          <Link to="/" className="back-button">← 返回</Link>
          <h1 className="search-title">搜尋商品</h1>
        </div>
      </header>

      {/* Search Container */}
      <div className="search-main-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
            placeholder="搜尋商品..."
            className="search-input"
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="clear-button">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Recent Searches */}
        {recentSearches.length > 0 && !searchTerm && (
          <div className="search-section">
            <h2 className="section-title">最近搜尋</h2>
            <div className="keyword-list">
              {recentSearches.map((keyword, index) => (
                <div key={index} className="keyword-item">
                  <button
                    onClick={() => handleSearch(keyword)}
                    className="keyword-button"
                  >
                    {keyword}
                  </button>
                  <button
                    onClick={() => removeRecentSearch(keyword)}
                    className="remove-button"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hot Keywords */}
        {!searchTerm && (
          <div className="search-section">
            <h2 className="section-title">
              <TrendingUp size={20} />
              熱門搜尋
            </h2>
            <div className="hot-keywords">
              {hotKeywords.map((keyword, index) => (
                <button
                  key={index}
                  onClick={() => handleSearch(keyword)}
                  className="hot-keyword-button"
                >
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchTerm && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <div className="empty-results">
                <p>找不到「{searchTerm}」的相關商品</p>
                <p className="empty-hint">試試其他關鍵字或瀏覽熱門商品</p>
              </div>
            ) : (
              <div className="results-grid">
                {searchResults.map(product => (
                  <div key={product.id} className="product-card">
                    <img src={product.image} alt={product.name} className="product-image" />
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <div className="product-price">
                        <span className="price">NT$ {product.price.toLocaleString()}</span>
                        {product.originalPrice && (
                          <span className="original-price">
                            NT$ {product.originalPrice.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <div className="product-rating">⭐ {product.rating}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link to="/" className="nav-item">
          <Home size={24} />
          <span>首頁</span>
        </Link>
        <Link to="/wishlist" className="nav-item">
          <Heart size={24} />
          <span>最愛</span>
        </Link>
        <Link to="/" className="nav-item">
          <ShoppingCart size={24} />
          <span>購物車</span>
        </Link>
        <Link to="/search" className="nav-item active">
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

export default SearchPage;