// pages/admin/components/OrderManagement.tsx
import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';

interface Order {
  id: number;
  order_no: string;
  receiver_name: string;
  total: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface OrderDetail {
  id: number;
  order_no: string;
  receiver_name: string;
  receiver_phone: string;
  receiver_email: string;
  receiver_address: string;
  shipping_method: string;
  payment_method: string;
  payment_status: string;
  status: string;
  subtotal: number;
  shipping_fee: number;
  total: number;
  created_at: string;
  user_name: string;
  user_email: string;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  product_id: number;
  variant_id: number;
  product_name: string;
  product_image: string;
  variant_name: string;
  price: number;
  quantity: number;
  subtotal: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<OrderDetail | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // 搜尋和篩選
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // 分頁
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // 載入訂單列表
  const fetchOrders = async (page: number = 1) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // 建立查詢參數
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await fetch(
        `http://45.32.24.240/api/orders/admin/all?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setOrders(data.orders);
        setPagination(data.pagination);
      } else {
        alert('載入訂單失敗');
      }
    } catch (error) {
      console.error('載入訂單失敗:', error);
      alert('載入訂單失敗');
    } finally {
      setLoading(false);
    }
  };

  // 查看訂單詳情
  const handleViewDetails = async (orderNo: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://45.32.24.240/api/orders/admin/${orderNo}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        setSelectedOrder(data.order);
        setShowDetailModal(true);
      } else {
        alert('載入訂單詳情失敗');
      }
    } catch (error) {
      console.error('載入訂單詳情失敗:', error);
      alert('載入訂單詳情失敗');
    }
  };

  // 更新訂單狀態
  const handleStatusChange = async (orderNo: string, newStatus: string) => {
    if (!confirm(`確定要將訂單狀態改為「${getStatusText(newStatus)}」嗎？`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://45.32.24.240/api/orders/admin/${orderNo}/status`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ status: newStatus })
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert('訂單狀態已更新');
        fetchOrders(pagination.page);
      } else {
        alert(data.message || '更新訂單狀態失敗');
      }
    } catch (error) {
      console.error('更新訂單狀態失敗:', error);
      alert('更新訂單狀態失敗');
    }
  };

  // 刪除訂單（API 尚未實作，會報錯）
  const handleDeleteOrder = async (orderNo: string) => {
    if (!confirm(`確定要刪除訂單 ${orderNo} 嗎？此操作無法復原！`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://45.32.24.240/api/orders/admin/${orderNo}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        alert('訂單已刪除');
        fetchOrders(pagination.page);
      } else {
        alert(data.message || '刪除訂單失敗');
      }
    } catch (error) {
      console.error('刪除訂單失敗:', error);
      alert('刪除訂單失敗：API 尚未實作');
    }
  };

  // 搜尋
  const handleSearch = () => {
    fetchOrders(1);
  };

  // 重置搜尋
  const handleResetSearch = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setTimeout(() => fetchOrders(1), 0);
  };

  // 分頁
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      fetchOrders(newPage);
    }
  };

  // 狀態文字
  const getStatusText = (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'pending': '待處理',
      'paid': '已付款',
      'shipped': '已出貨',
      'completed': '已完成',
      'cancelled': '已取消'
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
      'cancelled': '#f44336'
    };
    return colorMap[status] || '#666';
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

  // 初始載入
  useEffect(() => {
    fetchOrders();
  }, []);

  return (
    <div className="order-management">
      <h2 className="page-title">訂單管理</h2>

      {/* 搜尋和篩選區 */}
      <div className="filter-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="搜尋訂單編號或客戶姓名"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button onClick={handleSearch} className="btn-search">
            搜尋
          </button>
        </div>

        <select 
          value={statusFilter} 
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setTimeout(() => fetchOrders(1), 0);
          }}
          className="status-filter"
        >
          <option value="all">全部狀態</option>
          <option value="pending">待處理</option>
          <option value="paid">已付款</option>
          <option value="shipped">已出貨</option>
          <option value="completed">已完成</option>
          <option value="cancelled">已取消</option>
        </select>

        <button onClick={handleResetSearch} className="btn-reset">
          重置
        </button>
      </div>

      {/* 訂單列表 */}
      <div className="content-card">
        {loading ? (
          <div className="loading">載入中...</div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>訂單編號</th>
                    <th>客戶姓名</th>
                    <th>訂單金額</th>
                    <th>訂單日期</th>
                    <th>付款狀態</th>
                    <th>訂單狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="no-data">
                        暫無訂單資料
                      </td>
                    </tr>
                  ) : (
                    orders.map((order) => (
                      <tr key={order.id}>
                        <td className="order-id">{order.order_no}</td>
                        <td>{order.receiver_name}</td>
                        <td className="order-total">{formatPrice(order.total)}</td>
                        <td>{formatDate(order.created_at)}</td>
                        <td>
                          <span className={`badge badge-${order.payment_status}`}>
                            {order.payment_status === 'unpaid' ? '未付款' : '已付款'}
                          </span>
                        </td>
                        <td>
                          <select
                            value={order.status}
                            onChange={(e) => handleStatusChange(order.order_no, e.target.value)}
                            className="status-select"
                            style={{ 
                              color: getStatusColor(order.status),
                              fontWeight: 'bold'
                            }}
                          >
                            <option value="pending">待處理</option>
                            <option value="paid">已付款</option>
                            <option value="shipped">已出貨</option>
                            <option value="completed">已完成</option>
                            <option value="cancelled">已取消</option>
                          </select>
                        </td>
                        <td className="actions">
                          <button 
                            onClick={() => handleViewDetails(order.order_no)}
                            className="btn-detail"
                          >
                            查看詳情
                          </button>
                          <button 
                            onClick={() => handleDeleteOrder(order.order_no)}
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

            {/* 分頁 */}
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page === 1}
                  className="btn-page"
                >
                  上一頁
                </button>
                
                <span className="page-info">
                  第 {pagination.page} 頁 / 共 {pagination.totalPages} 頁
                  （共 {pagination.total} 筆訂單）
                </span>
                
                <button 
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                  className="btn-page"
                >
                  下一頁
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* 訂單詳情彈窗 */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>訂單詳情</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowDetailModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* 訂單資訊 */}
              <section className="detail-section">
                <h4>訂單資訊</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">訂單編號：</span>
                    <span className="value">{selectedOrder.order_no}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">訂單狀態：</span>
                    <span 
                      className="value"
                      style={{ color: getStatusColor(selectedOrder.status), fontWeight: 'bold' }}
                    >
                      {getStatusText(selectedOrder.status)}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="label">訂單日期：</span>
                    <span className="value">{formatDate(selectedOrder.created_at)}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">付款方式：</span>
                    <span className="value">{selectedOrder.payment_method}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">付款狀態：</span>
                    <span className="value">
                      {selectedOrder.payment_status === 'unpaid' ? '未付款' : '已付款'}
                    </span>
                  </div>
                </div>
              </section>

              {/* 客戶資訊 */}
              <section className="detail-section">
                <h4>客戶資訊</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">客戶姓名：</span>
                    <span className="value">{selectedOrder.user_name || '訪客'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">客戶 Email：</span>
                    <span className="value">{selectedOrder.user_email || '-'}</span>
                  </div>
                </div>
              </section>

              {/* 收件資訊 */}
              <section className="detail-section">
                <h4>收件資訊</h4>
                <div className="detail-grid">
                  <div className="detail-item">
                    <span className="label">收件人：</span>
                    <span className="value">{selectedOrder.receiver_name}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">收件電話：</span>
                    <span className="value">{selectedOrder.receiver_phone}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">收件 Email：</span>
                    <span className="value">{selectedOrder.receiver_email}</span>
                  </div>
                  <div className="detail-item full-width">
                    <span className="label">收件地址：</span>
                    <span className="value">{selectedOrder.receiver_address || '超商取貨'}</span>
                  </div>
                  <div className="detail-item">
                    <span className="label">配送方式：</span>
                    <span className="value">
                      {selectedOrder.shipping_method === 'home' ? '宅配到府' : '超商取貨'}
                    </span>
                  </div>
                </div>
              </section>

              {/* 商品清單 */}
              <section className="detail-section">
                <h4>商品清單</h4>
                <div className="items-list">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="item-row">
                      <div className="item-image">
                        {item.product_image ? (
                          <img src={item.product_image} alt={item.product_name} />
                        ) : (
                          <div className="no-image">無圖片</div>
                        )}
                      </div>
                      <div className="item-info">
                        <div className="item-name">{item.product_name}</div>
                        {item.variant_name && (
                          <div className="item-variant">規格：{item.variant_name}</div>
                        )}
                        <div className="item-price">
                          {formatPrice(item.price)} x {item.quantity}
                        </div>
                      </div>
                      <div className="item-subtotal">
                        {formatPrice(item.subtotal)}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* 金額明細 */}
              <section className="detail-section">
                <h4>金額明細</h4>
                <div className="amount-detail">
                  <div className="amount-row">
                    <span>商品小計：</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="amount-row">
                    <span>運費：</span>
                    <span>{formatPrice(selectedOrder.shipping_fee)}</span>
                  </div>
                  <div className="amount-row total">
                    <span>實付金額：</span>
                    <span>{formatPrice(selectedOrder.total)}</span>
                  </div>
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
    </div>
  );
};

export default OrderManagement;