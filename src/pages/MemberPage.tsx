import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, FileText, MessageSquare, LogOut, ChevronRight } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import './MemberPage.css';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_no: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  items: OrderItem[];
  total: number;
  created_at: string;
}

interface MemberProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  points: number;
  carrier_code: string | null;
}

const MemberPage: React.FC = () => {
  const navigate = useNavigate();
  const API_BASE = '/api';

  // 會員資料
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal 狀態
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showBasicInfoModal, setShowBasicInfoModal] = useState(false);
  const [showCarrierModal, setShowCarrierModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // 表單狀態
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [carrierCode, setCarrierCode] = useState('');

  // 載入會員資料
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchOrders();
  }, [navigate]);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/members/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.member);
        setEditName(data.member.name);
        setEditPhone(data.member.phone);
        setCarrierCode(data.member.carrier_code || '');
      }
    } catch (error) {
      console.error('取得會員資料失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/members/orders`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setOrders(data.orders);
      }
    } catch (error) {
      console.error('取得訂單失敗:', error);
    }
  };

  // 訂單統計（方案 B：4 種）
  const orderCounts = {
    unpaid: orders.filter(o => o.status === 'pending').length,
    pending: orders.filter(o => o.status === 'paid').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  // 狀態轉換中文
  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '待付款',
      paid: '待出貨',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消'
    };
    return map[status] || status;
  };

  // 更新基本資料
  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/members/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editName, phone: editPhone })
      });
      const data = await res.json();
      if (data.success) {
        alert('資料更新成功');
        setShowBasicInfoModal(false);
        fetchProfile();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('更新失敗');
    }
  };

  // 更新載具
  const handleUpdateCarrier = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_BASE}/members/carrier`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ carrier_code: carrierCode })
      });
      const data = await res.json();
      if (data.success) {
        alert('載具設定成功');
        setShowCarrierModal(false);
        fetchProfile();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('設定失敗');
    }
  };

  const handleLogout = () => {
    if (window.confirm('確定要登出嗎?')) {
      localStorage.removeItem('token');
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('isAdmin');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('userName');
      navigate('/login');
    }
  };

  const handleCustomerService = () => {
    setShowServiceModal(true);
  };

  const handleMemberGuide = () => {
    alert('會員使用說明\n\n1. 註冊成為會員享有專屬優惠\n2. 累積購物金回饋\n3. 生日月享有特殊折扣\n4. 優先收到新品資訊');
  };

  if (loading) {
    return (
      <div className="member-page">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

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
            <div className="member-info-display">
              <p className="member-name">{profile?.name || '會員'}</p>
              <p className="member-points">點數：{profile?.points || 0} 點</p>
            </div>
          </div>
        </section>

        {/* Order Status */}
        <section className="order-status-section">
          <div className="order-status-card">
            <div className="order-status-boxes">
              <div className="order-box">
                <div className="order-count">{orderCounts.unpaid}</div>
                <p className="order-label">待付款</p>
              </div>
              <div className="order-box">
                <div className="order-count">{orderCounts.pending}</div>
                <p className="order-label">待出貨</p>
              </div>
              <div className="order-box">
                <div className="order-count">{orderCounts.shipped}</div>
                <p className="order-label">已出貨</p>
              </div>
              <div className="order-box">
                <div className="order-count">{orderCounts.completed}</div>
                <p className="order-label">已完成</p>
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
            <button className="menu-item" onClick={() => setShowCarrierModal(true)}>
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

      <BottomNav activePage="member" />

      {/* Order Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>我的訂單</h2>
              <button onClick={() => setShowOrderModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              {orders.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>目前沒有訂單</p>
              ) : (
                orders.map(order => (
                  <div key={order.id} className="order-item">
                    <div className="order-info">
                      <h4 className="order-id">{order.order_no}</h4>
                      <p className="order-items">
                        {order.items.map(item => `${item.product_name} x${item.quantity}`).join(', ')}
                      </p>
                      <p className="order-date">
                        {new Date(order.created_at).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <div className="order-right">
                      <span className={`order-status ${order.status}`}>
                        {getStatusText(order.status)}
                      </span>
                      <p className="order-total">NT$ {order.total.toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
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
                <label>Email（不可修改）</label>
                <input 
                  type="email" 
                  value={profile?.email || ''} 
                  className="form-input" 
                  disabled 
                />
              </div>
              <div className="form-group">
                <label>姓名</label>
                <input 
                  type="text" 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="請輸入姓名" 
                  className="form-input" 
                />
              </div>
              <div className="form-group">
                <label>電話</label>
                <input 
                  type="tel" 
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="請輸入電話" 
                  className="form-input" 
                />
              </div>
              <button className="form-submit" onClick={handleUpdateProfile}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* Carrier Modal */}
      {showCarrierModal && (
        <div className="modal-overlay" onClick={() => setShowCarrierModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>手機條碼載具</h2>
              <button onClick={() => setShowCarrierModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">
                請輸入您的手機條碼載具（格式：/+7碼英數字，例如：/ABC1234）
              </p>
              <div className="form-group">
                <label>手機條碼</label>
                <input 
                  type="text" 
                  value={carrierCode}
                  onChange={(e) => setCarrierCode(e.target.value.toUpperCase())}
                  placeholder="/XXXXXXX" 
                  className="form-input"
                  maxLength={8}
                />
              </div>
              <button className="form-submit" onClick={handleUpdateCarrier}>設定載具</button>
            </div>
          </div>
        </div>
      )}
      {/* Service Modal */}
      {showServiceModal && (
        <div className="modal-overlay" onClick={() => setShowServiceModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>聯絡客服</h2>
              <button onClick={() => setShowServiceModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="service-item">
                <h4>📧 Email 聯絡</h4>
                <p>stone.ci7@gmail.com</p>
                <a href="mailto:stone.ci7@gmail.com" className="service-btn">
                  發送郵件
                </a>
              </div>
              <div className="service-item">
                <h4>💬 LINE 官方帳號</h4>
                <p>請至首頁掃描 QRCode 加入官方 LINE</p>
                <button 
                  className="service-btn"
                  onClick={() => {
                    setShowServiceModal(false);
                    navigate('/');
                  }}
                >
                  前往首頁
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberPage;