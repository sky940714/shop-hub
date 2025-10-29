// pages/admin/AdminLayout.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingCart, Package, Users, BarChart3, LogOut , Settings } from 'lucide-react';
import Dashboard from './components/Dashboard';
import ProductManagement from './components/ProductManagement';
import OrderManagement from './components/OrderManagement';
import MemberManagement from './components/MemberManagement';
import CategoryManagement from './components/CategoryManagement';
import MainSettings from './components/MainSettings';  
import './styles/AdminLayout.css';

type TabType = 'dashboard' | 'products' | 'orders' | 'members' | 'categories'| 'settings';

const AdminLayout: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const handleLogout = () => {
    if (window.confirm('確定要登出嗎？')) {
      // 清除所有登入狀態
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // 導向登入頁
      navigate('/login');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'products':
        return <ProductManagement />;
      case 'orders':
        return <OrderManagement />;
      case 'members':
        return <MemberManagement />;
      case 'categories':
        return <CategoryManagement />;
      case 'settings':
        return <MainSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="admin-layout">
      {/* 頂部導航 */}
      <header className="admin-header">
        <div className="header-container">
          <div className="header-left">
            <ShoppingCart className="header-icon" />
            <h1 className="header-title">安鑫購物後台管理</h1>
          </div>
          <div className="header-right">
            <span className="admin-name">管理員</span>
            <div className="admin-avatar">A</div>
            <button className="logout-btn" onClick={handleLogout} title="登出">
              <LogOut className="logout-icon" />
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="admin-container">
        <div className="admin-content">
          {/* 側邊欄 */}
          <aside className="admin-sidebar">
            <nav className="sidebar-nav">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              >
                <BarChart3 className="nav-icon" />
                數據總覽
              </button>
              <button
                onClick={() => setActiveTab('products')}
                className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
              >
                <Package className="nav-icon" />
                商品管理
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
              >
                <ShoppingCart className="nav-icon" />
                訂單管理
              </button>
              <button
                onClick={() => setActiveTab('members')}
                className={`nav-item ${activeTab === 'members' ? 'active' : ''}`}
              >
                <Users className="nav-icon" />
                會員管理
              </button>
              <button
                onClick={() => setActiveTab('categories')}
                className={`nav-item ${activeTab === 'categories' ? 'active' : ''}`}
              >
                <Package className="nav-icon" />
                分類管理
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
            >
                <Settings className="nav-icon" />
                主要設定
                </button>
            </nav>
          </aside>

          {/* 主內容區 */}
          <main className="admin-main">
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default AdminLayout;