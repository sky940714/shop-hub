import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, FileText, MessageSquare, LogOut, ChevronRight, Home, Heart, ShoppingCart, Search } from 'lucide-react';
import './MemberPage.css';

interface Order {
  id: string;
  status: '待出貨' | '已出貨' | '待取貨';
  items: string;
  total: number;
  date: string;
}

interface MemberData {
  username: string;
  memberCode: string;
  orders: Order[];
}

const MemberPage: React.FC = () => {
    const navigate = useNavigate();
  const [memberData] = useState<MemberData>({
    username: '請登入',
    memberCode: '請登入',
    orders: [
      { id: 'ORD001', status: '待出貨', items: '白色T恤 x1', total: 890, date: '2025-01-10' },
      { id: 'ORD002', status: '已出貨', items: '藍牙耳機 x1', total: 2990, date: '2025-01-08' },
      { id: 'ORD003', status: '待取貨', items: '咖啡禮盒 x1', total: 1580, date: '2025-01-05' }
    ]
  });

  const [username, setUsername] = useState(memberData.username);
  const [memberCode, setMemberCode] = useState(memberData.memberCode);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showPhoneVerifyModal, setShowPhoneVerifyModal] = useState(false);

  useEffect(() => {
    setUsername(memberData.username);
    setMemberCode(memberData.memberCode);
  }, [memberData]);

  const orderCounts = {
    pending: memberData.orders.filter(order => order.status === '待出貨').length,
    shipped: memberData.orders.filter(order => order.status === '已出貨').length,
    pickup: memberData.orders.filter(order => order.status === '待取貨').length
  };

  const handleLogout = () => {
    if (window.confirm('確定要登出嗎?')) {
      // 清除所有登入狀態
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      
      // 導向登入頁面
      navigate('/login');
    }
  };

  const handleCustomerService = () => {
    const message = prompt('請輸入您的問題或建議:');
    if (message && message.trim()) {
      alert('感謝您的留言,客服人員會在24小時內回覆您!');
    }
  };

  const handleMemberGuide = () => {
    alert('會員使用說明\n\n1. 註冊成為會員享有專屬優惠\n2. 累積購物金回饋\n3. 生日月享有特殊折扣\n4. 優先收到新品資訊');
  };

  return (
    <div className="member-page">
      {/* Header */}
      <header className="member-header">
        <div className="member-header-content">
          <h1 className="member-logo">安鑫購物</h1>
          <p className="member-subtitle">會員專區</p>
        </div>
      </header>

      {/* 主要內容容器 */}
      <div className="member-container">
        {/* Member Info Card */}
        <section className="member-info-section">
          <div className="member-card">
            <div className="member-avatar">
              <User size={50} />
            </div>
            <div className="member-inputs">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用戶名稱"
                className="member-input"
              />
              <input
                type="password"
                value={memberCode}
                onChange={(e) => setMemberCode(e.target.value)}
                placeholder="會員編號"
                className="member-input"
              />
            </div>
          </div>
        </section>

        {/* Order Status */}
        <section className="order-status-section">
          <div className="order-status-card">
            <div className="order-status-boxes">
              <div className="order-box">
                <div className="order-count">{orderCounts.pending}</div>
                <p className="order-label">待出貨</p>
              </div>
              <div className="order-box">
                <div className="order-count">{orderCounts.shipped}</div>
                <p className="order-label">已出貨</p>
              </div>
              <div className="order-box">
                <div className="order-count">{orderCounts.pickup}</div>
                <p className="order-label">待取貨</p>
              </div>
            </div>
            <button className="view-orders-btn" onClick={() => setShowOrderModal(true)}>
              查看訂單
            </button>
          </div>
        </section>

        {/* Menu List */}
        <section className="menu-section">
          <div className="menu-list">
            <button className="menu-item" onClick={() => setShowBasicInfoModal(true)}>
              <User size={22} />
              <span>基本資料</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
            <button className="menu-item" onClick={() => setShowPhoneVerifyModal(true)}>
              <Package size={22} />
              <span>手機條碼載具</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
            <button className="menu-item" onClick={handleMemberGuide}>
              <FileText size={22} />
              <span>會員使用說明</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
            <button className="menu-item" onClick={handleCustomerService}>
              <MessageSquare size={22} />
              <span>客服留言</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
            <button className="menu-item logout-item" onClick={handleLogout}>
              <LogOut size={22} />
              <span>登出</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
          </div>
        </section>
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
        <Link to="/search" className="nav-item">
          <Search size={24} />
          <span>搜尋</span>
        </Link>
        <Link to="/member" className="nav-item active">
          <User size={24} />
          <span>會員</span>
        </Link>
      </nav>

      {/* Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>我的訂單</h2>
              <button onClick={() => setShowOrderModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              {memberData.orders.map(order => (
                <div key={order.id} className="order-item">
                  <div className="order-info">
                    <h4 className="order-id">{order.id}</h4>
                    <p className="order-items">{order.items}</p>
                    <p className="order-date">{order.date}</p>
                  </div>
                  <div className="order-right">
                    <span className={`order-status ${
                      order.status === '待出貨' ? 'pending' : 
                      order.status === '已出貨' ? 'shipped' : 'pickup'
                    }`}>
                      {order.status}
                    </span>
                    <p className="order-total">NT$ {order.total.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Basic Info Modal */}
      {showBasicInfoModal && (
        <div className="modal-overlay" onClick={() => setShowBasicInfoModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>基本資料</h2>
              <button onClick={() => setShowBasicInfoModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>姓名</label>
                <input type="text" placeholder="請輸入姓名" className="form-input" />
              </div>
              <div className="form-group">
                <label>電話</label>
                <input type="tel" placeholder="請輸入電話" className="form-input" />
              </div>
              <div className="form-group">
                <label>地址</label>
                <textarea placeholder="請輸入地址" className="form-textarea"></textarea>
              </div>
              <button className="form-submit">儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Phone Verify Modal */}
      {showPhoneVerifyModal && (
        <div className="modal-overlay" onClick={() => setShowPhoneVerifyModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>手機條碼載具</h2>
              <button onClick={() => setShowPhoneVerifyModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">請輸入您的手機條碼載具資訊</p>
              <div className="form-group">
                <label>手機條碼</label>
                <input type="text" placeholder="/XXXXXXXX" className="form-input" />
              </div>
              <div className="form-group">
                <label>驗證碼</label>
                <input type="text" placeholder="請輸入驗證碼" className="form-input" />
              </div>
              <button className="form-submit">設定載具</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPage;