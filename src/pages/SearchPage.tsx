import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, X, TrendingUp, Loader } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import './SearchPage.css'; 
import { apiFetch } from '../utils/api';

// 定義後端回傳的資料格式
interface BackendProduct {
  id: number;
  name: string;
  price: number;
  description?: string;
  stock: number;
  category_names: string | null;
  main_image: string | null;
  created_at?: string;
}

// 定義前端顯示用的資料格式
interface DisplayProduct {
  id: number;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  category: string;
  rating: number;
}

const SearchPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // 狀態管理
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [allProducts, setAllProducts] = useState<DisplayProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 從 localStorage 讀取歷史紀錄
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recentSearches');
      return saved ? JSON.parse(saved) : ['白色T恤', '藍牙耳機', '咖啡豆'];
    } catch (e) {
      return ['白色T恤', '藍牙耳機', '咖啡豆'];
    }
  });

  const hotKeywords = ['特價商品', '新品上市', '熱銷排行', '限時優惠'];

  // 1. 初始化：從後端抓取商品
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        const response = await apiFetch('/api/products/published');
        
        if (!response.ok) throw new Error('無法連線至伺服器');

        const data = await response.json();

        if (data.success && Array.isArray(data.products)) {
          const mappedProducts: DisplayProduct[] = data.products.map((p: BackendProduct) => ({
            id: p.id,
            name: p.name,
            price: p.price,
            originalPrice: undefined, 
            image: p.main_image 
              ? (p.main_image.startsWith('http') ? p.main_image : `/uploads/${p.main_image}`)
              : 'https://placehold.co/300x300?text=No+Image', 
            category: p.category_names || '未分類',
            rating: 5.0, 
          }));
          setAllProducts(mappedProducts);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setError('目前無法載入商品目錄，請稍後再試。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // 2. 處理 URL 分類參數
  useEffect(() => {
    const category = searchParams.get('category');
    if (category) {
      setCategoryFilter(category);
      setSearchTerm(category);
    }
  }, [searchParams]);

  // 3. 監聽歷史紀錄變化
  useEffect(() => {
    localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
  }, [recentSearches]);

  // 4. 過濾搜尋結果
  const searchResults = useMemo(() => {
    const lowerTerm = searchTerm.toLowerCase().trim();

    if (categoryFilter) {
      return allProducts.filter(product => {
        if (!product.category) return false;
        const categories = product.category.split(',').map(c => c.trim()); 
        return categories.includes(categoryFilter);
      });
    }
    
    if (!lowerTerm) return [];
    
    return allProducts.filter(product => 
      product.name.toLowerCase().includes(lowerTerm) || 
      product.category.toLowerCase().includes(lowerTerm)
    );
  }, [searchTerm, categoryFilter, allProducts]);

  const handleClearSearch = () => {
    setSearchTerm('');
    setCategoryFilter('');
    navigate('/search');
  };

  const handleSearch = (keyword: string) => {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    setSearchTerm(trimmed);
    const newHistory = [trimmed, ...recentSearches.filter(k => k !== trimmed)].slice(0, 6);
    setRecentSearches(newHistory);
  };

  const removeRecentSearch = (keyword: string) => {
    setRecentSearches(recentSearches.filter(item => item !== keyword));
  };

  return (
    <div className="search-page">
      <header className="search-header">
        <div className="search-header-content">
          <Link to="/" className="back-button">← 返回</Link>
          <h1 className="search-title">搜尋商品</h1>
        </div>
      </header>

      <div className="search-main-container">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchTerm)}
            placeholder="搜尋商品名稱或分類..."
            className="search-input"
            autoFocus
          />
          {searchTerm && (
            <button onClick={handleClearSearch} className="clear-button" aria-label="清除搜尋">
              <X size={20} />
            </button>
          )}
        </div>

        {isLoading && (
          <div className="loading-container">
            <Loader className="loader-spinner" size={24} />
            <span>正在載入商品目錄...</span>
          </div>
        )}

        {error && !isLoading && <div className="error-message">⚠️ {error}</div>}

        {!isLoading && recentSearches.length > 0 && !searchTerm && (
          <div className="search-section">
            <h2 className="section-title">最近搜尋</h2>
            <div className="keyword-list">
              {recentSearches.map((keyword, index) => (
                <div key={index} className="keyword-item">
                  <button onClick={() => handleSearch(keyword)} className="keyword-button">
                    {keyword}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); removeRecentSearch(keyword); }}
                    className="remove-button"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isLoading && !searchTerm && (
          <div className="search-section">
            <h2 className="section-title">
              <TrendingUp size={20} />
              熱門搜尋
            </h2>
            <div className="hot-keywords">
              {hotKeywords.map((keyword, index) => (
                <button key={index} onClick={() => handleSearch(keyword)} className="hot-keyword-button">
                  {keyword}
                </button>
              ))}
            </div>
          </div>
        )}

        {!isLoading && searchTerm && (
          <div className="search-results">
            {searchResults.length === 0 ? (
              <div className="empty-results">
                <p>找不到「{searchTerm}」的相關商品</p>
                <p className="empty-hint">試試其他關鍵字或瀏覽熱門商品</p>
              </div>
            ) : (
              <div className="results-grid">
                {searchResults.map(product => (
                  <Link to={`/product/${product.id}`} key={product.id} className="product-card-link">
                    <div className="product-card">
                      <div className="product-image-container">
                         <img 
                           src={product.image} 
                           alt={product.name} 
                           className="product-image"
                           loading="lazy"
                           onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/300x300?text=No+Image'; }}
                         />
                      </div>
                      <div className="product-info">
                        <h3 className="product-name" title={product.name}>{product.name}</h3>
                        <div className="product-meta">
                           <span className="product-category-tag" title={product.category}>
                             {product.category}
                           </span>
                        </div>
                        <div className="product-price-row">
                          <span className="price">NT$ {product.price.toLocaleString()}</span>
                          {product.originalPrice && (
                            <span className="original-price">NT$ {product.originalPrice.toLocaleString()}</span>
                          )}
                        </div>
                        <div className="product-rating">⭐ {product.rating}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav activePage="search" />
    </div>
  );
};

export default SearchPage;