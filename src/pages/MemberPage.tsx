// src/pages/MemberPage.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Package, FileText, MessageSquare, LogOut, ChevronRight, RefreshCcw, ChevronLeft, CreditCard, Smartphone, MapPin } from 'lucide-react';
import BottomNav from '../components/BottomNav';
import './MemberPage.css';
import ECPayForm from './checkout/components/ECPayForm';
import { apiFetch } from '../utils/api';

interface OrderItem {
  product_name: string;
  quantity: number;
  price: number;
}

interface Order {
  id: number;
  order_no: string;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled' | 'return_requested';
  payment_method: string; 
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

interface ShippingAddress {
  id: number;
  recipient_name: string;
  phone: string;
  zip_code: string;
  full_address: string;
  is_default: number;
}

// 🟢 新增：退貨設定的物件型態定義
interface ReturnSettingsData {
  return_711_name: string;
  return_711_phone: string;
  return_711_instruction: string;
  return_fami_name: string;
  return_fami_phone: string;
  return_fami_instruction: string;
  return_hilife_name: string;
  return_hilife_phone: string;
  return_hilife_instruction: string;
  return_home_name: string;
  return_home_phone: string;
  return_home_instruction: string;
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
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);
  // 🟢 新增：控制退貨指南彈窗的狀態
  const [showReturnGuideModal, setShowReturnGuideModal] = useState(false);

  // 收件地址相關
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [showAddressFormModal, setShowAddressFormModal] = useState(false);
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [editingAddress, setEditingAddress] = useState<ShippingAddress | null>(null);
  const [addressForm, setAddressForm] = useState({
    recipient_name: '',
    phone: '',
    zip_code: '',
    full_address: '',
    is_default: false
  });
  
  // 退貨 Modal 與 表單狀態
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [selectedOrderNo, setSelectedOrderNo] = useState<string>('');
  const [returnForm, setReturnForm] = useState({
    reason: '',
    bankCode: '',
    bankAccount: ''
  });

  // 🟢 新增：存放從資料庫撈出來的退貨資訊狀態
  const [returnSettings, setReturnSettings] = useState<ReturnSettingsData | null>(null);

  // 綠界金流參數 State
  const [ecpayParams, setEcpayParams] = useState<any>(null);

  // 處理重新付款
  const handlePay = async (orderId: number) => {
    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch('/api/ecpay/checkout', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ orderId })
      });
      const params = await res.json();
      if (params) {
        setEcpayParams(params);
      } else {
        alert('無法取得付款資訊');
      }
    } catch (error) {
      console.error('付款請求失敗:', error);
      alert('無法前往付款頁面，請稍後再試');
    }
  };

  // 表單狀態
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [carrierCode, setCarrierCode] = useState('');

  // 載入會員資料與退貨設定
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchProfile();
    fetchOrders();
    fetchAddresses();
    fetchReturnSettings(); // 🟢 初始載入時同步撈取退貨活資料
  }, [navigate]);

  const fetchProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/members/profile`, {
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
      const res = await apiFetch(`${API_BASE}/members/orders`, {
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

  const fetchAddresses = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/members/addresses`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setAddresses(data.addresses);
      }
    } catch (error) {
      console.error('取得收件地址失敗:', error);
    }
  };

  // 🟢 新增：從後端 API 撈取退貨指南設定
  const fetchReturnSettings = async () => {
    try {
      const res = await apiFetch(`${API_BASE}/settings/return-methods`);
      const data = await res.json();
      if (data.success && data.settings) {
        setReturnSettings(data.settings);
      }
    } catch (error) {
      console.error('前端 App 載入退貨設定失敗:', error);
    }
  };

  // 訂單統計
  const orderCounts = {
    unpaid: orders.filter(o => o.status === 'pending').length,
    pending: orders.filter(o => o.status === 'paid').length,
    shipped: orders.filter(o => o.status === 'shipped').length,
    completed: orders.filter(o => o.status === 'completed').length
  };

  const getStatusText = (status: string) => {
    const map: Record<string, string> = {
      pending: '待付款',
      paid: '待出貨',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消',
      return_requested: '退貨處理中'
    };
    return map[status] || status;
  };

  const handleOpenReturn = (orderNo: string) => {
    setSelectedOrderNo(orderNo);
    setReturnForm({ reason: '', bankCode: '', bankAccount: '' });
    setShowOrderModal(false);
    setShowReturnModal(true);
  };

  const handleSubmitReturn = async () => {
    if (!returnForm.reason || !returnForm.bankCode || !returnForm.bankAccount) {
      alert('請填寫完整退貨資訊 (原因、銀行代碼、帳號)');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`${API_BASE}/returns/apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderNo: selectedOrderNo,
          ...returnForm
        })
      });

      const data = await res.json();
      if (data.success) {
        alert('退貨申請已提交');
        setShowReturnModal(false);
        fetchOrders();
        setShowOrderModal(true);
      } else {
        alert(data.message || '申請失敗');
      }
    } catch (error) {
      console.error('退貨申請錯誤:', error);
      alert('系統錯誤，請稍後再試');
    }
  };

  const handleCancelOrder = async (orderNo: string) => {
    if (!window.confirm('確定要取消這筆訂單嗎？\n如果是已付款訂單，取消後我們將進行退款流程。')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await apiFetch(`/api/orders/${orderNo}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await res.json();
      if (data.success) {
        alert(data.message);
        fetchOrders();
      } else {
        alert(data.message || '取消失敗');
      }
    } catch (error) {
      console.error('取消訂單錯誤:', error);
      alert('系統錯誤，請稍後再試');
    }
  };

  const handleUpdateProfile = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/members/profile`, {
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

  const handleUpdateCarrier = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/members/carrier`, {
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

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({ recipient_name: '', phone: '', zip_code: '', full_address: '', is_default: false });
    setShowAddressModal(false);
    setShowAddressFormModal(true);
  };

  const handleOpenEditAddress = (address: ShippingAddress) => {
    setEditingAddress(address);
    setAddressForm({
      recipient_name: address.recipient_name,
      phone: address.phone,
      zip_code: address.zip_code,
      full_address: address.full_address,
      is_default: address.is_default === 1
    });
    setShowAddressModal(false);
    setShowAddressFormModal(true);
  };

  const handleSaveAddress = async () => {
    if (!addressForm.recipient_name || !addressForm.phone || !addressForm.full_address) {
      alert('請填寫完整資訊');
      return;
    }

    const token = localStorage.getItem('token');
    try {
      const url = editingAddress 
        ? `${API_BASE}/members/addresses/${editingAddress.id}`
        : `${API_BASE}/members/addresses`;
      
      const res = await apiFetch(url, {
        method: editingAddress ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(addressForm)
      });

      const data = await res.json();
      if (data.success) {
        alert(editingAddress ? '地址更新成功' : '地址新增成功');
        setShowAddressFormModal(false);
        setShowAddressModal(true);
        fetchAddresses();
      } else {
        alert(data.message || '操作失敗');
      }
    } catch (error) {
      alert('操作失敗');
    }
  };

  const handleDeleteAddress = async (id: number) => {
    if (!window.confirm('確定要刪除此地址嗎？')) return;

    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/members/addresses/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();
      if (data.success) {
        alert('地址已刪除');
        fetchAddresses();
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleDeleteAccount = async () => {
    const confirmDelete = window.confirm(
      '【嚴重警告】您確定要永久刪除帳號嗎？\n\n1. 此動作無法復原。\n2. 您的購物車、收藏清單與點數將被清空。\n\n如果您確定要刪除，請按「確定」。'
    );
    if (!confirmDelete) return;

    const token = localStorage.getItem('token');
    try {
      const res = await apiFetch(`${API_BASE}/auth/delete`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      if (data.success) {
        alert('帳號已成功刪除。');
        localStorage.removeItem('token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        navigate('/login');
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除帳號錯誤:', error);
      alert('系統發生錯誤，請稍後再試');
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
        <div className="member-header-content" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={() => navigate(-1)} 
            style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
          >
            <ChevronLeft size={32} />
          </button>
          <div>
            <h1 className="member-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer', display: 'inline-block' }}>
              安鑫購物
            </h1>
            <p className="member-subtitle">會員專區</p>
          </div>
        </div>
      </header>

      {/* 主要內容 */}
      <div className="member-container">
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

        {/* 訂單狀態狀態按鈕 */}
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

        {/* 選單清單 */}
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
            <button className="menu-item" onClick={() => setShowAddressModal(true)}>
              <Package size={22} />
              <span>收件地址管理</span>
              <ChevronRight size={22} className="menu-arrow" />
            </button>
            <button className="menu-item" onClick={() => setShowInstallGuideModal(true)}>
              <Smartphone size={22} color="#007aff" />
              <span style={{ color: '#007aff', fontWeight: 'bold' }}>安卓 App 安裝教學</span>
              <ChevronRight size={22} className="menu-arrow" color="#007aff" />
            </button>
            
            {/* 🟢 新增：退貨方式指南選單入口 */}
            <button className="menu-item" onClick={() => setShowReturnGuideModal(true)} style={{ backgroundColor: '#fff5f5' }}>
              <MapPin size={22} color="#e53e3e" />
              <span style={{ color: '#e53e3e', fontWeight: 'bold' }}>退貨方式說明</span>
              <ChevronRight size={22} className="menu-arrow" color="#e53e3e" />
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
            <button className="menu-item" onClick={handleDeleteAccount} style={{ color: '#dc2626' }}>
              <LogOut size={22} />
              <span>刪除帳號</span>
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

      {/* 訂單 Modal */}
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
                      
                      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        {order.status === 'pending' && order.payment_method !== 'cod' && (
                          <button 
                            onClick={() => handlePay(order.id)}
                            style={{ padding: '4px 12px', fontSize: '12px', color: 'white', backgroundColor: '#28a745', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            <CreditCard size={14} />
                            前往付款
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'paid') && (
                          <button 
                            onClick={() => handleCancelOrder(order.order_no)}
                            style={{ padding: '4px 12px', fontSize: '12px', color: '#6b7280', border: '1px solid #d1d5db', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                          >
                            取消訂單
                          </button>
                        )}
                        {order.status === 'completed' && (
                          <button 
                            className="return-btn"
                            style={{ padding: '4px 8px', fontSize: '12px', color: '#e53e3e', border: '1px solid #e53e3e', borderRadius: '4px', background: 'white', cursor: 'pointer' }}
                            onClick={() => handleOpenReturn(order.order_no)}
                          >
                            申請退貨
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 退貨填寫 Modal */}
      {showReturnModal && (
        <div className="modal-overlay" onClick={() => { setShowReturnModal(false); setShowOrderModal(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>申請退貨 ({selectedOrderNo})</h2>
              <button onClick={() => { setShowReturnModal(false); setShowOrderModal(true); }} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p style={{fontSize: '14px', color: '#666', marginBottom: '15px'}}>
                請填寫退貨原因及退款帳戶資訊。審核通過後，我們會通知您將商品寄回。
              </p>
              <div className="form-group">
                <label>退貨原因 *</label>
                <textarea 
                  className="form-input" 
                  placeholder="請說明商品問題..."
                  rows={3}
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                />
              </div>
              <div className="form-group">
                <label>退款銀行代碼 *</label>
                <input 
                  type="text"
                  className="form-input" 
                  placeholder="例如: 822 (中國信託)"
                  value={returnForm.bankCode}
                  onChange={(e) => setReturnForm({...returnForm, bankCode: e.target.value})}
                  maxLength={3}
                />
              </div>
              <div className="form-group">
                <label>退款銀行帳號 *</label>
                <input 
                  type="text"
                  className="form-input" 
                  placeholder="請輸入帳號"
                  value={returnForm.bankAccount}
                  onChange={(e) => setReturnForm({...returnForm, bankAccount: e.target.value})}
                />
              </div>
              <button className="form-submit" onClick={handleSubmitReturn} style={{ backgroundColor: '#e53e3e' }}>
                確認送出退貨申請
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🟢 新增：退貨方式說明（讀取後端資料庫活資料）彈窗 */}
      {showReturnGuideModal && (
        <div className="modal-overlay" onClick={() => setShowReturnGuideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>📦 店家退貨指引說明</h2>
              <button onClick={() => setShowReturnGuideModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto', fontSize: '14px' }}>
              <p style={{ marginBottom: '15px', color: '#666', lineHeight: '1.5' }}>
                請根據您當初選擇的配送渠道，參閱下方對應的退貨收件人與說明。如有疑問請聯絡客服。
              </p>

              {returnSettings ? (
                <>
                  {/* 7-11 區塊 */}
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: '4px solid #fe6222' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#fe6222', display: 'flex', gap: '6px' }}>🏪 7-ELEVEN 退貨資訊</h4>
                    <p style={{ margin: '4px 0' }}><strong>收件人：</strong>{returnSettings.return_711_name || '未設定'}</p>
                    <p style={{ margin: '4px 0' }}><strong>聯絡電話：</strong>{returnSettings.return_711_phone || '未設定'}</p>
                    <p style={{ margin: '4px 0', color: '#555' }}><strong>說明：</strong>{returnSettings.return_711_instruction || '無'}</p>
                  </div>

                  {/* 全家區塊 */}
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: '4px solid #00a0e9' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#00a0e9', display: 'flex', gap: '6px' }}>🏪 全家便利商店 退貨資訊</h4>
                    <p style={{ margin: '4px 0' }}><strong>收件人：</strong>{returnSettings.return_fami_name || '未設定'}</p>
                    <p style={{ margin: '4px 0' }}><strong>聯絡電話：</strong>{returnSettings.return_fami_phone || '未設定'}</p>
                    <p style={{ margin: '4px 0', color: '#555' }}><strong>說明：</strong>{returnSettings.return_fami_instruction || '無'}</p>
                  </div>

                  {/* 萊爾富區塊 */}
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '12px', borderLeft: '4px solid #e60012' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#e60012', display: 'flex', gap: '6px' }}>🏪 萊爾富超商 退貨資訊</h4>
                    <p style={{ margin: '4px 0' }}><strong>收件人：</strong>{returnSettings.return_hilife_name || '未設定'}</p>
                    <p style={{ margin: '4px 0' }}><strong>聯絡電話：</strong>{returnSettings.return_hilife_phone || '未設定'}</p>
                    <p style={{ margin: '4px 0', color: '#555' }}><strong>說明：</strong>{returnSettings.return_hilife_instruction || '無'}</p>
                  </div>

                  {/* 宅配區塊 */}
                  <div style={{ background: '#f9fafb', padding: '12px', borderRadius: '8px', marginBottom: '15px', borderLeft: '4px solid #4b5563' }}>
                    <h4 style={{ margin: '0 0 6px 0', color: '#4b5563', display: 'flex', gap: '6px' }}>🚚 宅配到府 退貨資訊</h4>
                    <p style={{ margin: '4px 0' }}><strong>收件人：</strong>{returnSettings.return_home_name || '未設定'}</p>
                    <p style={{ margin: '4px 0' }}><strong>聯絡電話：</strong>{returnSettings.return_home_phone || '未設定'}</p>
                    <p style={{ margin: '4px 0', color: '#555' }}><strong>地址指南：</strong>{returnSettings.return_home_instruction || '無'}</p>
                  </div>
                </>
              ) : (
                <p style={{ padding: '20px', textAlign: 'center', color: '#999' }}>⏳ 正在連線伺服器獲取最新退貨指南...</p>
              )}

              <button className="form-submit" onClick={() => setShowReturnGuideModal(false)} style={{ backgroundColor: '#e53e3e' }}>
                關閉說明
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 基本資料 Modal */}
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
                <input type="email" value={profile?.email || ''} className="form-input" disabled />
              </div>
              <div className="form-group">
                <label>姓名</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="請輸入姓名" className="form-input" />
              </div>
              <div className="form-group">
                <label>電話</label>
                <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="請輸入電話" className="form-input" />
              </div>
              <button className="form-submit" onClick={handleUpdateProfile}>儲存</button>
            </div>
          </div>
        </div>
      )}

      {/* 載具 Modal */}
      {showCarrierModal && (
        <div className="modal-overlay" onClick={() => setShowCarrierModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>手機條碼載具</h2>
              <button onClick={() => setShowCarrierModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <p className="modal-description">請輸入您的手機條碼載具（格式：/+7碼英數字，例如：/ABC1234）</p>
              <div className="form-group">
                <label>手機條碼</label>
                <input type="text" value={carrierCode} onChange={(e) => setCarrierCode(e.target.value.toUpperCase())} placeholder="/XXXXXXX" className="form-input" maxLength={8} />
              </div>
              <button className="form-submit" onClick={handleUpdateCarrier}>設定載具</button>
            </div>
          </div>
        </div>
      )}

      {/* 地址列表 Modal */}
      {showAddressModal && (
        <div className="modal-overlay" onClick={() => setShowAddressModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>收件地址管理</h2>
              <button onClick={() => setShowAddressModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              {addresses.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#666' }}>尚未設定收件地址</p>
              ) : (
                addresses.map(addr => (
                  <div key={addr.id} style={{ padding: '12px', border: '1px solid #e0e0e0', borderRadius: '8px', marginBottom: '10px', backgroundColor: addr.is_default ? '#f0f9ff' : '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p style={{ fontWeight: 'bold', marginBottom: '4px' }}>
                          {addr.recipient_name} {addr.phone}
                          {addr.is_default === 1 && (
                            <span style={{ marginLeft: '8px', fontSize: '12px', color: '#3b82f6', backgroundColor: '#e0f2fe', padding: '2px 6px', borderRadius: '4px' }}>預設</span>
                          )}
                        </p>
                        <p style={{ fontSize: '14px', color: '#666' }}>{addr.zip_code} {addr.full_address}</p>
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => handleOpenEditAddress(addr)} style={{ padding: '4px 8px', fontSize: '12px', cursor: 'pointer' }}>編輯</button>
                        <button onClick={() => handleDeleteAddress(addr.id)} style={{ padding: '4px 8px', fontSize: '12px', color: '#e53e3e', cursor: 'pointer' }}>刪除</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
              <button className="form-submit" onClick={handleOpenAddAddress} style={{ marginTop: '15px' }}>新增收件地址</button>
            </div>
          </div>
        </div>
      )}

      {/* 地址編輯表單 Modal */}
      {showAddressFormModal && (
        <div className="modal-overlay" onClick={() => { setShowAddressFormModal(false); setShowAddressModal(true); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingAddress ? '編輯地址' : '新增地址'}</h2>
              <button onClick={() => { setShowAddressFormModal(false); setShowAddressModal(true); }} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>收件人姓名 *</label>
                <input type="text" className="form-input" value={addressForm.recipient_name} onChange={(e) => setAddressForm({...addressForm, recipient_name: e.target.value})} placeholder="請輸入姓名" />
              </div>
              <div className="form-group">
                <label>手機號碼 *</label>
                <input type="tel" className="form-input" value={addressForm.phone} onChange={(e) => setAddressForm({...addressForm, phone: e.target.value})} placeholder="09XXXXXXXX" />
              </div>
              <div className="form-group">
                <label>郵遞區號</label>
                <input type="text" className="form-input" value={addressForm.zip_code} onChange={(e) => setAddressForm({...addressForm, zip_code: e.target.value})} placeholder="例如：100" maxLength={5} />
              </div>
              <div className="form-group">
                <label>詳細地址 *</label>
                <input type="text" className="form-input" value={addressForm.full_address} onChange={(e) => setAddressForm({...addressForm, full_address: e.target.value})} placeholder="請輸入完整地址（含縣市區）" />
              </div>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={addressForm.is_default} onChange={(e) => setAddressForm({...addressForm, is_default: e.target.checked})} />
                  設為預設地址
                </label>
              </div>
              <button className="form-submit" onClick={handleSaveAddress}>{editingAddress ? '更新地址' : '新增地址'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 客服留言 Modal */}
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
                <a href="mailto:stone.ci7@gmail.com" className="service-btn">發送郵件</a>
              </div>
              <div className="service-item">
                <h4>💬 LINE 官方帳號</h4>
                <p>請至首頁掃描 QRCode 加入官方 LINE</p>
                <button className="service-btn" onClick={() => { setShowServiceModal(false); navigate('/'); }}>前往首頁</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Android 安裝教學 Modal */}
      {showInstallGuideModal && (
        <div className="modal-overlay" onClick={() => setShowInstallGuideModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📱 安卓 App 安裝教學</h2>
              <button onClick={() => setShowInstallGuideModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body" style={{ lineHeight: '1.6', color: '#333' }}>
              <p style={{ marginBottom: '15px', fontWeight: 'bold', color: '#007aff' }}>免透過商店！直接將「安鑫購物」加入手機桌面，購物更流暢！</p>
              <div style={{ background: '#f0f9ff', padding: '15px', borderRadius: '8px', marginBottom: '15px', border: '1px solid #bae6fd' }}>
                <h4 style={{ margin: '0 0 10px 0', color: '#0369a1' }}>💡 Chrome 瀏覽器安裝步驟：</h4>
                <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '15px' }}>
                  <li style={{ marginBottom: '10px' }}>點擊瀏覽器右上角的 <strong>「三個點 (⋮)」</strong> 開啟選單</li>
                  <li style={{ marginBottom: '10px' }}>尋找並點選 <strong>「加到主畫面」</strong> 或 <strong>「安裝應用程式」</strong></li>
                  <li style={{ marginBottom: '10px' }}>點擊 <strong>「新增/安裝」</strong>，等待幾秒鐘</li>
                  <li>回到您的手機桌面，就可以看到安鑫購物的 App 圖示囉！🎉</li>
                </ol>
              </div>
              <button className="form-submit" onClick={() => setShowInstallGuideModal(false)} style={{ backgroundColor: '#007aff' }}>我知道了</button>
            </div>
          </div>
        </div>
      )}

      {/* 隱藏的綠界表單 */}
      <ECPayForm params={ecpayParams} />
    </div>
  );
};

export default MemberPage;