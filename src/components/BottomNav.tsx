import React, { useLayoutEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, ShoppingCart, Heart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './BottomNav.css';

const PATH_TO_INDEX: Record<string, number> = {
  '/': 0,
  '/search': 1,
  '/cart': 2,
  '/wishlist': 3,
  '/member': 4,
};

const BottomNav: React.FC = () => {
  const { pathname } = useLocation();
  const { cartCount } = useCart();
  const activeIndex = PATH_TO_INDEX[pathname] ?? -1;
  const [fading, setFading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (activeIndex === -1) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setFading(false);
    timerRef.current = setTimeout(() => setFading(true), 520);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [activeIndex]);

  if (activeIndex === -1) return null;

  return (
    <nav className="bottom-nav">
      <div
        className={`nav-indicator${fading ? ' nav-indicator--fading' : ''}`}
        style={{ transform: `translateX(calc(${activeIndex} * 100%))` }}
      />

      <Link to="/" className={`nav-item ${activeIndex === 0 ? 'active' : ''}`}>
        <Home size={22} />
        <span>首頁</span>
      </Link>

      <Link to="/search" className={`nav-item ${activeIndex === 1 ? 'active' : ''}`}>
        <Search size={22} />
        <span>搜尋</span>
      </Link>

      <Link to="/cart" className={`nav-item ${activeIndex === 2 ? 'active' : ''}`}>
        <ShoppingCart size={22} />
        <span>購物車</span>
        {cartCount > 0 && <span className="nav-cart-badge">{cartCount}</span>}
      </Link>

      <Link to="/wishlist" className={`nav-item ${activeIndex === 3 ? 'active' : ''}`}>
        <Heart size={22} />
        <span>最愛</span>
      </Link>

      <Link to="/member" className={`nav-item ${activeIndex === 4 ? 'active' : ''}`}>
        <User size={22} />
        <span>會員</span>
      </Link>
    </nav>
  );
};

export default BottomNav;
