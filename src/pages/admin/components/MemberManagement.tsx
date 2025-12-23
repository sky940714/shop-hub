// pages/admin/components/MemberManagement.tsx
import React, { useState, useEffect } from 'react';
import '../styles/MemberManagement.css';

interface Member {
  id: number;
  name: string;
  email: string;
  phone: string;
  points: number;
  total_orders: number;
  total_spent: number;
  join_date: string;
}

interface MemberDetail extends Member {
  // 繼承 Member 的所有屬性
}

interface Order {
  order_no: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface PointHistory {
  id: number;
  order_no: string;
  points: number;
  type: string;
  description: string;
  created_at: string;
}

const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // 會員詳情彈窗
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberDetail | null>(null);
  const [memberOrders, setMemberOrders] = useState<Order[]>([]);
  const [pointHistory, setPointHistory] = useState<PointHistory[]>([]);
  
  // 點數調整
  const [showPointsModal, setShowPointsModal] = useState(false);
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsDescription, setPointsDescription] = useState('');

  // 刪除確認
const [showDeleteModal, setShowDeleteModal] = useState(false);
const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // 載入會員列表
  const fetchMembers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      
      const response = await fetch(
        `/api/members/admin/all?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setMembers(data.members);
      } else {
        alert('載入會員失敗');
      }
    } catch (error) {
      console.error('載入會員失敗:', error);
      alert('載入會員失敗');
    } finally {
      setLoading(false);
    }
  };

  // 查看會員詳情
  const handleViewDetails = async (memberId: number) => {
    try {
      const token = localStorage.getItem('token');
      
      // 查詢會員資料
      const memberResponse = await fetch(
        `/api/members/admin/${memberId}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const memberData = await memberResponse.json();
      
      // 查詢訂單列表
      const ordersResponse = await fetch(
        `/api/members/admin/${memberId}/orders`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const ordersData = await ordersResponse.json();
      
      // 查詢點數歷史
      const historyResponse = await fetch(
        `/api/members/admin/${memberId}/points-history`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const historyData = await historyResponse.json();
      
      if (memberData.success && ordersData.success && historyData.success) {
        setSelectedMember(memberData.member);
        setMemberOrders(ordersData.orders);
        setPointHistory(historyData.history);
        setShowDetailModal(true);
      } else {
        alert('載入會員詳情失敗');
      }
    } catch (error) {
      console.error('載入會員詳情失敗:', error);
      alert('載入會員詳情失敗');
    }
  };

  // 調整點數
  const handleAdjustPoints = async () => {
    if (!selectedMember) return;
    
    const points = parseInt(pointsAmount);
    if (isNaN(points) || points === 0) {
      alert('請輸入有效的點數');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/members/admin/${selectedMember.id}/points`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            points: points,
            description: pointsDescription
          })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert('點數調整成功');
        setShowPointsModal(false);
        setPointsAmount('');
        setPointsDescription('');
        // 重新載入會員詳情
        handleViewDetails(selectedMember.id);
        fetchMembers();
      } else {
        alert(data.message || '調整點數失敗');
      }
    } catch (error) {
      console.error('調整點數失敗:', error);
      alert('調整點數失敗');
    }
  };

  // 刪除會員
  const handleDeleteMember = async () => {
    if (!memberToDelete) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `/api/members/admin/${memberToDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert(data.message);
        setShowDeleteModal(false);
        setMemberToDelete(null);
        fetchMembers();
      } else {
        alert(data.message || '刪除會員失敗');
      }
    } catch (error) {
      console.error('刪除會員失敗:', error);
      alert('刪除會員失敗');
    }
  };

  // 快速調整點數
  const quickAdjustPoints = (amount: number) => {
    setPointsAmount(amount.toString());
    setShowPointsModal(true);
  };

  // 搜尋
  const handleSearch = () => {
    fetchMembers();
  };

  // 格式化日期
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 格式化金額
  const formatPrice = (price: number): string => {
    return `NT$ ${price.toLocaleString()}`;
  };

  // 狀態文字
  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': '待處理',
      'paid': '已付款',
      'shipped': '已出貨',
      'completed': '已完成',
      'cancelled': '已取消',
      'return_requested': '退貨處理中', 
      'refunded': '已退款'              
    };
    return statusMap[status] || status;
  };

  // 狀態顏色
  const getStatusColor = (status: string): string => {
    const colorMap: { [key: string]: string } = {
      'pending': '#ffa500',
      'paid': '#2196f3',
      'shipped': '#9c27b0',
      'completed': '#4caf50',
      'cancelled': '#f44336',
      'return_requested': '#e91e63', 
      'refunded': '#795548'          
    };
    return colorMap[status] || '#666';
  };

  // 初始載入
  useEffect(() => {
    fetchMembers();
  }, []);

  return (
    <div className="member-management">
      <h2 className="page-title">會員管理</h2>

      {/* 搜尋區 */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜尋會員姓名、Email 或電話"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-search">
            搜尋
          </button>
        </div>
        <button 
          onClick={() => {
            setSearchTerm('');
            setTimeout(() => fetchMembers(), 0);
          }} 
          className="btn-reset"
        >
          重置
        </button>
      </div>

      {/* 會員列表 */}
      <div className="content-card">
        {loading ? (
          <div className="loading">載入中...</div>
        ) : (
          <div className="table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>會員編號</th>
                  <th>姓名</th>
                  <th>Email</th>
                  <th>電話</th>
                  <th>點數</th>
                  <th>訂單數</th>
                  <th>消費金額</th>
                  <th>加入日期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="no-data">
                      暫無會員資料
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id}>
                      <td className="member-id">{member.id}</td>
                      <td>{member.name}</td>
                      <td>{member.email}</td>
                      <td>{member.phone}</td>
                      <td className="member-points">{member.points}</td>
                      <td>{member.total_orders}</td>
                      <td className="member-spent">{formatPrice(member.total_spent)}</td>
                      <td>{formatDate(member.join_date)}</td>
                        <td className="actions">
                        <button 
                          onClick={() => handleViewDetails(member.id)}
                          className="btn-detail"
                        >
                          詳情
                        </button>
                        <button 
                          onClick={() => {
                            setMemberToDelete(member);
                            setShowDeleteModal(true);
                          }}
                          className="btn-delete"
                        >
                          刪除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 會員詳情彈窗 */}
      {showDetailModal && selectedMember && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>會員詳情 - {selectedMember.name}</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* 基本資訊 */}
              <section className="detail-section">
                <h4>基本資訊</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">會員編號：</span>
                    <span className="value">{selectedMember.id}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">姓名：</span>
                    <span className="value">{selectedMember.name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">Email：</span>
                    <span className="value">{selectedMember.email}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">電話：</span>
                    <span className="value">{selectedMember.phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">註冊日期：</span>
                    <span className="value">{formatDate(selectedMember.join_date)}</span>
                  </div>
                </div>
              </section>

              {/* 消費統計 */}
              <section className="detail-section">
                <h4>消費統計</h4>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-label">訂單數</div>
                    <div className="stat-value">{selectedMember.total_orders} 筆</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-label">消費金額</div>
                    <div className="stat-value">{formatPrice(selectedMember.total_spent)}</div>
                  </div>
                  <div className="stat-card highlight">
                    <div className="stat-label">當前點數</div>
                    <div className="stat-value">{selectedMember.points} 點</div>
                  </div>
                </div>
              </section>

              {/* 點數調整 */}
              <section className="detail-section">
                <h4>點數調整</h4>
                <div className="points-buttons">
                  <button onClick={() => quickAdjustPoints(10)} className="btn-points-add">+10</button>
                  <button onClick={() => quickAdjustPoints(50)} className="btn-points-add">+50</button>
                  <button onClick={() => quickAdjustPoints(100)} className="btn-points-add">+100</button>
                  <button onClick={() => quickAdjustPoints(-10)} className="btn-points-minus">-10</button>
                  <button onClick={() => quickAdjustPoints(-50)} className="btn-points-minus">-50</button>
                  <button onClick={() => quickAdjustPoints(-100)} className="btn-points-minus">-100</button>
                  <button onClick={() => {
                    setPointsAmount('');
                    setShowPointsModal(true);
                  }} className="btn-points-custom">自訂</button>
                </div>
              </section>

              {/* 歷史訂單 */}
              <section className="detail-section">
                <h4>歷史訂單</h4>
                <div className="orders-list">
                  {memberOrders.length === 0 ? (
                    <div className="no-data">暫無訂單記錄</div>
                  ) : (
                    <table className="mini-table">
                      <thead>
                        <tr>
                          <th>訂單編號</th>
                          <th>金額</th>
                          <th>狀態</th>
                          <th>日期</th>
                        </tr>
                      </thead>
                      <tbody>
                        {memberOrders.map((order) => (
                          <tr key={order.order_no}>
                            <td>{order.order_no}</td>
                            <td>{formatPrice(order.total)}</td>
                            <td style={{ color: getStatusColor(order.status) }}>
                              {getStatusText(order.status)}
                            </td>
                            <td>{formatDate(order.created_at)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </section>

              {/* 點數歷史 */}
              <section className="detail-section">
                <h4>點數歷史</h4>
                <div className="history-list">
                  {pointHistory.length === 0 ? (
                    <div className="no-data">暫無點數記錄</div>
                  ) : (
                    pointHistory.map((record) => (
                      <div key={record.id} className="history-item">
                        <div className="history-info">
                          <div className="history-desc">{record.description}</div>
                          <div className="history-date">{formatDate(record.created_at)}</div>
                        </div>
                        <div className={`history-points ${record.points > 0 ? 'positive' : 'negative'}`}>
                          {record.points > 0 ? '+' : ''}{record.points}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-close" 
                onClick={() => setShowDetailModal(false)}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 點數調整彈窗 */}
      {showPointsModal && (
        <div className="modal-overlay" onClick={() => setShowPointsModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>調整點數</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowPointsModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>點數變動（正數=增加，負數=減少）</label>
                <input
                  type="number"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(e.target.value)}
                  placeholder="例如：+10 或 -10"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>備註說明</label>
                <input
                  type="text"
                  value={pointsDescription}
                  onChange={(e) => setPointsDescription(e.target.value)}
                  placeholder="例如：活動贈送、錯誤調整等"
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowPointsModal(false)}
              >
                取消
              </button>
              <button 
                className="btn-confirm" 
                onClick={handleAdjustPoints}
              >
                確認調整
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 刪除確認彈窗 */}
      {showDeleteModal && memberToDelete && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>確認刪除</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowDeleteModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <p className="delete-warning">
                確定要刪除會員「<strong>{memberToDelete.name}</strong>」嗎？
              </p>
              <p className="delete-note">
                刪除後會員將無法登入，但訂單記錄會保留。
              </p>
            </div>

            <div className="modal-footer">
              <button 
                className="btn-cancel" 
                onClick={() => setShowDeleteModal(false)}
              >
                取消
              </button>
              <button 
                className="btn-danger" 
                onClick={handleDeleteMember}
              >
                確認刪除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberManagement;