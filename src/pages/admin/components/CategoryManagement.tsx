// pages/admin/components/CategoryManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import '../styles/CategoryManagement.css';

interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
  is_active: number;
  productCount: number;
  created_at: string;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 載入分類列表
  useEffect(() => {
    fetchCategories();
  }, []);

  // 取得所有分類
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('http://45.32.24.240/api/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      } else {
        setError('取得分類失敗');
      }
    } catch (error) {
      console.error('取得分類失敗:', error);
      setError('無法載入分類列表');
    } finally {
      setLoading(false);
    }
  };

  // 新增分類
  const handleAddCategory = async () => {
    const name = prompt('請輸入新分類名稱：');
    if (!name || name.trim() === '') return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('請先登入');
        return;
      }

      const response = await fetch('http://45.32.24.240/api/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          parent_id: null,
          level: 1
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('分類新增成功！');
        fetchCategories(); // 重新載入列表
      } else {
        alert(data.message || '新增失敗');
      }
    } catch (error) {
      console.error('新增分類失敗:', error);
      alert('新增分類時發生錯誤');
    }
  };

  // 編輯分類
  const handleEditCategory = async (category: Category) => {
    const newName = prompt('請輸入新的分類名稱：', category.name);
    if (!newName || newName.trim() === '' || newName === category.name) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('請先登入');
        return;
      }

      const response = await fetch(`http://45.32.24.240/api/categories/${category.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newName.trim(),
          parent_id: category.parent_id,
          level: category.level,
          is_active: category.is_active
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('分類更新成功！');
        fetchCategories(); // 重新載入列表
      } else {
        alert(data.message || '更新失敗');
      }
    } catch (error) {
      console.error('更新分類失敗:', error);
      alert('更新分類時發生錯誤');
    }
  };

  // 刪除分類
  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`確定要刪除「${category.name}」分類嗎？`)) return;

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('請先登入');
        return;
      }

      const response = await fetch(`http://45.32.24.240/api/categories/${category.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('分類刪除成功！');
        fetchCategories(); // 重新載入列表
      } else {
        alert(data.message || '刪除失敗');
      }
    } catch (error) {
      console.error('刪除分類失敗:', error);
      alert('刪除分類時發生錯誤');
    }
  };

  // 載入中
  if (loading) {
    return (
      <div className="category-management">
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <p>載入中...</p>
        </div>
      </div>
    );
  }

  // 錯誤處理
  if (error) {
    return (
      <div className="category-management">
        <div style={{ textAlign: 'center', padding: '40px', color: '#ef4444' }}>
          <p>{error}</p>
          <button
            onClick={fetchCategories}
            style={{
              marginTop: '20px',
              padding: '10px 20px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            重新載入
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="category-management">
      <div className="page-header">
        <h2 className="page-title">分類管理</h2>
        <button className="btn-primary" onClick={handleAddCategory}>
          <Plus className="btn-icon" />
          新增分類
        </button>
      </div>

      <div className="category-grid">
        {categories.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', gridColumn: '1 / -1' }}>
            <p>目前沒有任何分類</p>
          </div>
        ) : (
          categories.map(category => (
            <div key={category.id} className="category-card">
              <div className="category-content">
                <div className="category-info">
                  <h3 className="category-name">{category.name}</h3>
                  <p className="category-count">商品數量: {category.productCount}</p>
                </div>
                <div className="category-actions">
                  <button
                    className="btn-icon-edit"
                    onClick={() => handleEditCategory(category)}
                    title="編輯"
                  >
                    <Edit2 className="icon" />
                  </button>
                  <button
                    className="btn-icon-delete"
                    onClick={() => handleDeleteCategory(category)}
                    title="刪除"
                  >
                    <Trash2 className="icon" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default CategoryManagement;