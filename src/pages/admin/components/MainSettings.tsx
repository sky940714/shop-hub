// pages/admin/components/MainSettings.tsx
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Store, Plus, Trash2, Edit2 } from 'lucide-react';
import '../styles/MainSettings.css';

interface MemberPoints {
  email: string;
  name: string;
  points: number;
}

interface ReturnAddress {
  id: string;
  name: string;
  recipient: string;
  phone: string;
  address: string;
  icon: string;
}

interface PickupStore {
  id: number;
  name: string;
  address: string;
  phone: string | null;
  business_hours: string | null;
  is_active: boolean;
}

const API_BASE = 'http://45.32.24.240/api';

const MainSettings: React.FC = () => {
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResult, setSearchResult] = useState<MemberPoints | null>(null);
  const [returnAddresses, setReturnAddresses] = useState<ReturnAddress[]>([
    {
      id: '7-11',
      name: '7-ELEVEN 超商取貨',
      recipient: '安鑫購物',
      phone: '0800-711-711',
      address: '請至您指定的7-ELEVEN門市退貨',
      icon: '🏪'
    },
    {
      id: 'family',
      name: '全家便利商店',
      recipient: '安鑫購物',
      phone: '0800-030-123',
      address: '請至您指定的全家便利商店門市退貨',
      icon: '🏪'
    },
    {
      id: 'hilife',
      name: '萊爾富便利商店',
      recipient: '安鑫購物',
      phone: '0800-000-299',
      address: '請至您指定的萊爾富門市退貨',
      icon: '🏪'
    },
    {
      id: 'home',
      name: '宅配到府',
      recipient: '安鑫購物客服中心',
      phone: '02-1234-5678',
      address: '台北市信義區信義路五段7號',
      icon: '🚚'
    }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);

  // 自取門市相關 state
  const [pickupStores, setPickupStores] = useState<PickupStore[]>([]);
  const [pickupLoading, setPickupLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStore, setEditingStore] = useState<PickupStore | null>(null);
  const [storeForm, setStoreForm] = useState({
    name: '',
    address: '',
    phone: '',
    business_hours: '',
    is_active: true
  });

  // 載入自取門市列表
  const fetchPickupStores = async () => {
    setPickupLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/pickup-stores/admin/all`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setPickupStores(data.stores);
      }
    } catch (error) {
      console.error('載入門市失敗:', error);
    } finally {
      setPickupLoading(false);
    }
  };

  useEffect(() => {
    fetchPickupStores();
  }, []);

  // 模擬會員點數資料（之後可替換成 API）
  const mockMemberData: MemberPoints[] = [
    { email: 'user@test.com', name: '測試用戶', points: 1500 },
    { email: 'demo@demo.com', name: '示範用戶', points: 2800 },
    { email: 'test@example.com', name: '張三', points: 500 }
  ];

  // 查詢會員點數
  const handleSearchPoints = () => {
    if (!searchEmail.trim()) {
      window.alert('請輸入會員 Email');
      return;
    }

    const member = mockMemberData.find(m => m.email === searchEmail);
    
    if (member) {
      setSearchResult(member);
    } else {
      setSearchResult(null);
      window.alert('查無此會員');
    }
  };

  // 儲存退貨地址
  const handleSaveAddress = (id: string) => {
    window.alert('退貨地址已更新！');
    setEditingId(null);
  };

  // 更新地址資料
  const updateAddress = (id: string, field: string, value: string) => {
    setReturnAddresses(returnAddresses.map(addr => 
      addr.id === id ? { ...addr, [field]: value } : addr
    ));
  };

  // 開啟新增門市 Modal
  const openAddModal = () => {
    setStoreForm({
      name: '',
      address: '',
      phone: '',
      business_hours: '',
      is_active: true
    });
    setEditingStore(null);
    setShowAddModal(true);
  };

  // 開啟編輯門市 Modal
  const openEditModal = (store: PickupStore) => {
    setStoreForm({
      name: store.name,
      address: store.address,
      phone: store.phone || '',
      business_hours: store.business_hours || '',
      is_active: store.is_active
    });
    setEditingStore(store);
    setShowAddModal(true);
  };

  // 關閉 Modal
  const closeModal = () => {
    setShowAddModal(false);
    setEditingStore(null);
    setStoreForm({
      name: '',
      address: '',
      phone: '',
      business_hours: '',
      is_active: true
    });
  };

  // 新增或更新門市
  const handleSaveStore = async () => {
    if (!storeForm.name.trim() || !storeForm.address.trim()) {
      window.alert('請填寫門市名稱和地址');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const url = editingStore 
        ? `${API_BASE}/pickup-stores/admin/${editingStore.id}`
        : `${API_BASE}/pickup-stores/admin`;
      const method = editingStore ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(storeForm)
      });

      const data = await res.json();

      if (data.success) {
        window.alert(editingStore ? '門市更新成功！' : '門市新增成功！');
        closeModal();
        fetchPickupStores();
      } else {
        window.alert(data.message || '操作失敗');
      }
    } catch (error) {
      console.error('儲存門市失敗:', error);
      window.alert('儲存失敗，請稍後再試');
    }
  };

  // 刪除門市
  const handleDeleteStore = async (id: number) => {
    if (!window.confirm('確定要刪除此門市嗎？')) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/pickup-stores/admin/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        window.alert('門市已刪除');
        fetchPickupStores();
      } else {
        window.alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除門市失敗:', error);
      window.alert('刪除失敗，請稍後再試');
    }
  };

  // 切換門市啟用狀態
  const handleToggleActive = async (store: PickupStore) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/pickup-stores/admin/${store.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...store,
          is_active: !store.is_active
        })
      });

      const data = await res.json();

      if (data.success) {
        fetchPickupStores();
      } else {
        window.alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新門市狀態失敗:', error);
    }
  };

  return (
    <div className="main-settings">
      <h2 className="page-title">主要設定</h2>

      {/* 自取門市管理 */}
      <div className="settings-section">
        <div className="section-header">
          <h3 className="section-title">
            <Store className="section-icon" />
            自取門市管理
          </h3>
          <button className="btn-add" onClick={openAddModal}>
            <Plus size={18} />
            新增門市
          </button>
        </div>

        <div className="settings-card">
          {pickupLoading ? (
            <div className="loading-text">載入中...</div>
          ) : pickupStores.length === 0 ? (
            <div className="empty-text">尚未設定任何自取門市</div>
          ) : (
            <div className="pickup-store-list">
              {pickupStores.map((store) => (
                <div key={store.id} className={`pickup-store-item ${!store.is_active ? 'inactive' : ''}`}>
                  <div className="store-main-info">
                    <div className="store-name-row">
                      <span className="store-icon">🏪</span>
                      <h4 className="store-name">{store.name}</h4>
                      <span className={`status-badge ${store.is_active ? 'active' : 'inactive'}`}>
                        {store.is_active ? '啟用中' : '已停用'}
                      </span>
                    </div>
                    <p className="store-address">📍 {store.address}</p>
                    {store.phone && <p className="store-detail">📞 {store.phone}</p>}
                    {store.business_hours && <p className="store-detail">🕐 {store.business_hours}</p>}
                  </div>
                  <div className="store-actions">
                    <button 
                      className="btn-toggle"
                      onClick={() => handleToggleActive(store)}
                    >
                      {store.is_active ? '停用' : '啟用'}
                    </button>
                    <button 
                      className="btn-edit-icon"
                      onClick={() => openEditModal(store)}
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      className="btn-delete-icon"
                      onClick={() => handleDeleteStore(store.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 查詢會員點數 */}
      <div className="settings-section">
        <h3 className="section-title">
          <Search className="section-icon" />
          查詢會員點數
        </h3>
        <div className="settings-card">
          <div className="search-group">
            <label className="form-label">會員 Email</label>
            <div className="search-input-group">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                className="form-input"
                placeholder="請輸入會員 Email (例如: user@test.com)"
                onKeyPress={(e) => e.key === 'Enter' && handleSearchPoints()}
              />
              <button 
                className="btn-search"
                onClick={handleSearchPoints}
              >
                查詢
              </button>
            </div>
          </div>

          {searchResult && (
            <div className="search-result">
              <div className="result-header">查詢結果</div>
              <div className="result-content">
                <div className="result-row">
                  <span className="result-label">會員姓名：</span>
                  <span className="result-value">{searchResult.name}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">Email：</span>
                  <span className="result-value">{searchResult.email}</span>
                </div>
                <div className="result-row">
                  <span className="result-label">目前點數：</span>
                  <span className="result-value points">{searchResult.points} 點</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 設定總退貨地址 */}
      <div className="settings-section">
        <h3 className="section-title">
          <MapPin className="section-icon" />
          退貨方式設定
        </h3>
        
        {returnAddresses.map((address) => (
          <div key={address.id} className="settings-card address-card">
            <div className="address-header">
              <div className="address-title">
                <span className="address-icon">{address.icon}</span>
                <h4>{address.name}</h4>
              </div>
              {editingId !== address.id && (
                <button 
                  className="btn-edit-small"
                  onClick={() => setEditingId(address.id)}
                >
                  編輯
                </button>
              )}
            </div>

            <div className="address-info">
              <div className="form-group">
                <label className="form-label">收件人</label>
                {editingId === address.id ? (
                  <input
                    type="text"
                    value={address.recipient}
                    onChange={(e) => updateAddress(address.id, 'recipient', e.target.value)}
                    className="form-input"
                  />
                ) : (
                  <div className="info-display">{address.recipient}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">聯絡電話</label>
                {editingId === address.id ? (
                  <input
                    type="tel"
                    value={address.phone}
                    onChange={(e) => updateAddress(address.id, 'phone', e.target.value)}
                    className="form-input"
                  />
                ) : (
                  <div className="info-display">{address.phone}</div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">退貨說明</label>
                {editingId === address.id ? (
                  <textarea
                    value={address.address}
                    onChange={(e) => updateAddress(address.id, 'address', e.target.value)}
                    className="form-textarea"
                    rows={3}
                  />
                ) : (
                  <div className="info-display">{address.address}</div>
                )}
              </div>

              {editingId === address.id && (
                <div className="button-group">
                  <button 
                    className="btn-secondary"
                    onClick={() => setEditingId(null)}
                  >
                    取消
                  </button>
                  <button 
                    className="btn-primary"
                    onClick={() => handleSaveAddress(address.id)}
                  >
                    儲存
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 新增/編輯門市 Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">
              {editingStore ? '編輯門市' : '新增門市'}
            </h3>
            
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">門市名稱 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：台北信義店"
                  value={storeForm.name}
                  onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">門市地址 *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：台北市信義區信義路五段7號"
                  value={storeForm.address}
                  onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">聯絡電話</label>
                <input
                  type="tel"
                  className="form-input"
                  placeholder="例如：02-1234-5678"
                  value={storeForm.phone}
                  onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">營業時間</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例如：週一至週五 10:00-21:00"
                  value={storeForm.business_hours}
                  onChange={(e) => setStoreForm({ ...storeForm, business_hours: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={storeForm.is_active}
                    onChange={(e) => setStoreForm({ ...storeForm, is_active: e.target.checked })}
                  />
                  啟用此門市
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeModal}>
                取消
              </button>
              <button className="btn-primary" onClick={handleSaveStore}>
                {editingStore ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MainSettings;