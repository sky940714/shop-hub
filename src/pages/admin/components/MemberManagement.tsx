// pages/admin/components/MemberManagement.tsx
import React, { useState, useEffect } from 'react';
import '../styles/MemberManagement.css';

interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalOrders: number;
  totalSpent: number;
  joinDate: string;
}

const MemberManagement: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    // TODO: 替換成 API 調用
    // const response = await fetch('/api/admin/members');
    // const data = await response.json();
    
    setMembers([
      {
        id: 'M001',
        name: '王小明',
        email: 'wang@example.com',
        phone: '0912-345-678',
        totalOrders: 5,
        totalSpent: 12500,
        joinDate: '2025-01-15'
      },
      {
        id: 'M002',
        name: '李小華',
        email: 'li@example.com',
        phone: '0923-456-789',
        totalOrders: 3,
        totalSpent: 8900,
        joinDate: '2025-03-20'
      },
      {
        id: 'M003',
        name: '張大同',
        email: 'zhang@example.com',
        phone: '0934-567-890',
        totalOrders: 8,
        totalSpent: 25600,
        joinDate: '2024-11-10'
      },
      {
        id: 'M004',
        name: '陳美玲',
        email: 'chen@example.com',
        phone: '0945-678-901',
        totalOrders: 2,
        totalSpent: 4200,
        joinDate: '2025-05-08'
      }
    ]);
  };

  return (
    <div className="member-management">
      <h2 className="page-title">會員管理</h2>

      <div className="content-card">
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>會員編號</th>
                <th>姓名</th>
                <th>Email</th>
                <th>電話</th>
                <th>訂單數</th>
                <th>消費金額</th>
                <th>加入日期</th>
              </tr>
            </thead>
            <tbody>
              {members.map(member => (
                <tr key={member.id}>
                  <td className="member-id">{member.id}</td>
                  <td>{member.name}</td>
                  <td>{member.email}</td>
                  <td>{member.phone}</td>
                  <td>{member.totalOrders}</td>
                  <td className="member-spent">NT$ {member.totalSpent.toLocaleString()}</td>
                  <td>{member.joinDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default MemberManagement;