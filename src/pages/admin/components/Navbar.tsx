// components/Navbar.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, User, Heart, Search, LogOut } from 'lucide-react';
import './Navbar.css';

const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
  const userName = localStorage.getItem('userName') || '用戶';

  const handleLogout = () => {
    if (window.confirm('確定要登出嗎？')) {
      // 清除登入狀態
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // 導向登入頁
      navigate('/login');
    }
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <div className="navbar-logo" onClick={() => navigate('/')}>
          <ShoppingCart className="logo-icon" />
          <span className="logo-text">安鑫購物</span>
        </div>

        {/* 導航連結 */}
        <div className="navbar-links">
          <button className="nav-link" onClick={() => navigate('/')}>
            首頁
          </button>
          <button className="nav-link" onClick={() => navigate('/search')}>
            <Search className="nav-icon" />
            搜尋
          </button>
          <button className="nav-link" onClick={() => navigate('/wishlist')}>
            <Heart className="nav-icon" />
            願望清單
          </button>
          <button className="nav-link" onClick={() => navigate('/member')}>
            <User className="nav-icon" />
            會員
          </button>
        </div>

        {/* 用戶資訊 */}
        <div className="navbar-user">
          {isLoggedIn ? (
            <>
              <span className="user-name">Hi, {userName}</span>
              <button className="logout-btn" onClick={handleLogout}>
                <LogOut className="logout-icon" />
                登出
              </button>
            </>
          ) : (
            <button className="login-btn" onClick={() => navigate('/login')}>
              登入
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;