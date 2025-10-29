// pages/admin/components/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { Package, ShoppingCart, Users, BarChart3 } from 'lucide-react';
import '../styles/Dashboard.css';

interface Stats {
  totalProducts: number;
  totalOrders: number;
  totalMembers: number;
  totalRevenue: number;
}

interface RecentOrder {
  id: string;
  customerName: string;
  total: number;
  status: string;
  date: string;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalProducts: 0,
    totalOrders: 0,
    totalMembers: 0,
    totalRevenue: 0
  });

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  useEffect(() => {
    // TODO: 替換成 API 調用
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    // 模擬 API 調用
    // const response = await fetch('/api/admin/dashboard');
    // const data = await response.json();
    
    // 模擬數據
    setStats({
      totalProducts: 156,
      totalOrders: 89,
      totalMembers: 342,
      totalRevenue: 487650
    });

    setRecentOrders([
      {
        id: 'ORD001',
        customerName: '王小明',
        total: 2580,
        status: 'processing',
        date: '2025-10-12'
      },
      {
        id: 'ORD002',
        customerName: '李小華',
        total: 590,
        status: 'shipped',
        date: '2025-10-11'
      },
      {
        id: 'ORD003',
        customerName: '張大同',
        total: 3420,
        status: 'completed',
        date: '2025-10-10'
      },
      {
        id: 'ORD004',
        customerName: '陳美玲',
        total: 1250,
        status: 'pending',
        date: '2025-10-10'
      },
      {
        id: 'ORD005',
        customerName: '林志明',
        total: 890,
        status: 'processing',
        date: '2025-10-09'
      }
    ]);
  };

  const getStatusClass = (status: string) => {
    const statusMap: { [key: string]: string } = {
      pending: 'status-pending',
      processing: 'status-processing',
      shipped: 'status-shipped',
      completed: 'status-completed',
      cancelled: 'status-cancelled'
    };
    return statusMap[status] || '';
  };

  const getStatusLabel = (status: string) => {
    const labelMap: { [key: string]: string } = {
      pending: '待處理',
      processing: '處理中',
      shipped: '已出貨',
      completed: '已完成',
      cancelled: '已取消'
    };
    return labelMap[status] || status;
  };

  return (
    <div className="dashboard">
      <h2 className="dashboard-title">數據總覽</h2>

      {/* 統計卡片 */}
      <div className="stats-grid">
        <div className="stat-card stat-blue">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">總商品數</p>
              <p className="stat-value">{stats.totalProducts}</p>
            </div>
            <Package className="stat-icon" />
          </div>
        </div>

        <div className="stat-card stat-purple">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">總訂單數</p>
              <p className="stat-value">{stats.totalOrders}</p>
            </div>
            <ShoppingCart className="stat-icon" />
          </div>
        </div>

        <div className="stat-card stat-green">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">總會員數</p>
              <p className="stat-value">{stats.totalMembers}</p>
            </div>
            <Users className="stat-icon" />
          </div>
        </div>

        <div className="stat-card stat-orange">
          <div className="stat-content">
            <div className="stat-info">
              <p className="stat-label">總營業額</p>
              <p className="stat-value">NT$ {stats.totalRevenue.toLocaleString()}</p>
            </div>
            <BarChart3 className="stat-icon" />
          </div>
        </div>
      </div>

      {/* 最近訂單 */}
      <div className="recent-orders">
        <h3 className="section-title">最近訂單</h3>
        <div className="table-container">
          <table className="orders-table">
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>客戶</th>
                <th>金額</th>
                <th>狀態</th>
                <th>日期</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">{order.id}</td>
                  <td>{order.customerName}</td>
                  <td className="order-total">NT$ {order.total.toLocaleString()}</td>
                  <td>
                    <span className={`status-badge ${getStatusClass(order.status)}`}>
                      {getStatusLabel(order.status)}
                    </span>
                  </td>
                  <td>{order.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;