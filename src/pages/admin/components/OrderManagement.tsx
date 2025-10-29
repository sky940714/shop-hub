// pages/admin/components/OrderManagement.tsx
import React, { useState, useEffect } from 'react';
import '../styles/OrderManagement.css';

interface Order {
  id: string;
  customerName: string;
  products: string[];
  total: number;
  status: 'pending' | 'processing' | 'shipped' | 'completed' | 'cancelled';
  date: string;
}

const OrderManagement: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    // TODO: 替換成 API 調用
    // const response = await fetch('/api/admin/orders');
    // const data = await response.json();
    
    setOrders([
      {
        id: 'ORD001',
        customerName: '王小明',
        products: ['經典T恤', '無線藍牙耳機'],
        total: 2580,
        status: 'processing',
        date: '2025-10-12'
      },
      {
        id: 'ORD002',
        customerName: '李小華',
        products: ['經典T恤'],
        total: 590,
        status: 'shipped',
        date: '2025-10-11'
      },
      {
        id: 'ORD003',
        customerName: '張大同',
        products: ['智能手錶', '運動鞋'],
        total: 6580,
        status: 'completed',
        date: '2025-10-10'
      },
      {
        id: 'ORD004',
        customerName: '陳美玲',
        products: ['無線藍牙耳機'],
        total: 1990,
        status: 'pending',
        date: '2025-10-09'
      }
    ]);
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    // TODO: PUT /api/admin/orders/:id/status
    setOrders(orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));
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
    <div className="order-management">
      <h2 className="page-title">訂單管理</h2>

      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>訂單編號</th>
                <th>客戶姓名</th>
                <th>商品</th>
                <th>總金額</th>
                <th>訂單日期</th>
                <th>狀態</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order.id}>
                  <td className="order-id">{order.id}</td>
                  <td>{order.customerName}</td>
                  <td>{order.products.join(', ')}</td>
                  <td className="order-total">NT$ {order.total.toLocaleString()}</td>
                  <td>{order.date}</td>
                  <td>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order.id, e.target.value as Order['status'])}
                      className={`status-select ${getStatusClass(order.status)}`}
                    >
                      <option value="pending">待處理</option>
                      <option value="processing">處理中</option>
                      <option value="shipped">已出貨</option>
                      <option value="completed">已完成</option>
                      <option value="cancelled">已取消</option>
                    </select>
                  </td>
                  <td>
                    <button className="btn-detail">查看詳情</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OrderManagement;