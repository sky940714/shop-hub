// pages/admin/components/MainSettings.tsx
import React, { useState } from 'react';
import { Search, MapPin } from 'lucide-react';
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

    // TODO: 替換成 API 調用
    // const response = await fetch(`/api/admin/members/points?email=${searchEmail}`);
    
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
    // TODO: 替換成 API 調用
    // await fetch(`/api/admin/settings/return-address/${id}`, {
    //   method: 'PUT',
    //   body: JSON.stringify(returnAddresses.find(addr => addr.id === id))
    // });
    
    window.alert('退貨地址已更新！');
    setEditingId(null);
  };

  // 更新地址資料
  const updateAddress = (id: string, field: string, value: string) => {
    setReturnAddresses(returnAddresses.map(addr => 
      addr.id === id ? { ...addr, [field]: value } : addr
    ));
  };

  return (
    <div className="main-settings">
      <h2 className="page-title">主要設定</h2>

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

          {/* 查詢結果 */}
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
    </div>
  );
};

export default MainSettings;