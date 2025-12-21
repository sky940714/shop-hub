import React from 'react';
import { Link } from 'react-router-dom';
import { Home, Search, ShoppingCart, Heart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './BottomNav.css';

interface BottomNavProps {
  activePage: 'home' | 'search' | 'cart' | 'wishlist' | 'member';
}

const BottomNav: React.FC<BottomNavProps> = ({ activePage }) => {
  const { cartCount } = useCart();

  return (
    <nav className="bottom-nav">
      <Link to="/" className={`nav-item ${activePage === 'home' ? 'active' : ''}`}>
        <Home size={22} />
        <span>首頁</span>
      </Link>
      <Link to="/search" className={`nav-item ${activePage === 'search' ? 'active' : ''}`}>
        <Search size={22} />
        <span>搜尋</span>
      </Link>
      <Link to="/cart" className={`nav-item ${activePage === 'cart' ? 'active' : ''}`}>
        <ShoppingCart size={22} />
        <span>購物車</span>
        {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
      </Link>
      <Link to="/wishlist" className={`nav-item ${activePage === 'wishlist' ? 'active' : ''}`}>
        <Heart size={22} />
        <span>最愛</span>
      </Link>
      <Link to="/member" className={`nav-item ${activePage === 'member' ? 'active' : ''}`}>
        <User size={22} />
        <span>會員</span>
      </Link>
    </nav>
  );
};

export default BottomNav;