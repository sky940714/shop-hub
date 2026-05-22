// src/pages/admin/components/ReturnSettings.tsx
import React, { useState, useEffect } from 'react';
import { MapPin } from 'lucide-react';
import { apiFetch } from '../../../utils/api';

interface ReturnAddress {
  id: string;
  name: string;
  recipient: string;
  phone: string;
  address: string;
  icon: string;
}

const ReturnSettings: React.FC = () => {
  const [returnAddresses, setReturnAddresses] = useState<ReturnAddress[]>([
    { id: '7-11', name: '7-ELEVEN 超商取貨', recipient: '', phone: '', address: '', icon: '🏪' },
    { id: 'family', name: '全家便利商店', recipient: '', phone: '', address: '', icon: '🏪' },
    { id: 'hilife', name: '萊爾富便利商店', recipient: '', phone: '', address: '', icon: '🏪' },
    { id: 'home', name: '宅配到府', recipient: '', phone: '', address: '', icon: '🚚' }
  ]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 載入真實的系統退貨設定資料
  const fetchReturnSettings = async () => {
    try {
      setLoading(true);
      const res = await apiFetch('/api/settings/return-methods');
      const data = await res.json();
      
      if (data.success && data.settings) {
        const s = data.settings;
        setReturnAddresses([
          { id: '7-11', name: '7-ELEVEN 超商取貨', recipient: s.return_711_name || '', phone: s.return_711_phone || '', address: s.return_711_instruction || '', icon: '🏪' },
          { id: 'family', name: '全家便利商店', recipient: s.return_fami_name || '', phone: s.return_fami_phone || '', address: s.return_fami_instruction || '', icon: '🏪' },
          { id: 'hilife', name: '萊爾富便利商店', recipient: s.return_hilife_name || '', phone: s.return_hilife_phone || '', address: s.return_hilife_instruction || '', icon: '🏪' },
          { id: 'home', name: '宅配到府', recipient: s.return_home_name || '', phone: s.return_home_phone || '', address: s.return_home_instruction || '', icon: '🚚' }
        ]);
      }
    } catch (error) {
      console.error('載入退貨設定失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  // 儲存特定物流方式到後端資料庫
  const handleSaveAddress = async (id: string) => {
    const target = returnAddresses.find(addr => addr.id === id);
    if (!target) return;

    try {
      const token = localStorage.getItem('token');
      let bodyData = {};

      if (id === '7-11') {
        bodyData = { return_711_name: target.recipient, return_711_phone: target.phone, return_711_instruction: target.address };
      } else if (id === 'family') {
        bodyData = { return_fami_name: target.recipient, return_fami_phone: target.phone, return_fami_instruction: target.address };
      } else if (id === 'hilife') {
        bodyData = { return_hilife_name: target.recipient, return_hilife_phone: target.phone, return_hilife_instruction: target.address };
      } else if (id === 'home') {
        bodyData = { return_home_name: target.recipient, return_home_phone: target.phone, return_home_instruction: target.address };
      }

      const res = await apiFetch('/api/settings/return-methods', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData)
      });

      const data = await res.json();
      if (data.success) {
        window.alert(`${target.name} 設定已成功同步至資料庫！`);
        setEditingId(null);
        fetchReturnSettings();
      } else {
        window.alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('儲存失敗:', error);
      window.alert('系統連線錯誤');
    }
  };

  const updateAddress = (id: string, field: string, value: string) => {
    setReturnAddresses(returnAddresses.map(addr => 
      addr.id === id ? { ...addr, [field]: value } : addr
    ));
  };

  useEffect(() => {
    fetchReturnSettings();
  }, []);

  if (loading && returnAddresses[0].recipient === '') {
    return <div className="loading-text" style={{ padding: '20px', textAlign: 'center' }}>退貨設定載入中...</div>;
  }

  return (
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
                <div className="info-display">{address.recipient || '(未設定)'}</div>
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
                <div className="info-display">{address.phone || '(未設定)'}</div>
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
                <div className="info-display">{address.address || '(未設定)'}</div>
              )}
            </div>

            {editingId === address.id && (
              <div className="button-group">
                <button 
                  className="btn-secondary"
                  onClick={() => {
                    setEditingId(null);
                    fetchReturnSettings();
                  }}
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
  );
};

export default ReturnSettings;