// pages/admin/components/CategoryManagement.tsx
import React, { useState } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import '../styles/CategoryManagement.css';

interface Category {
  id: string;
  name: string;
  productCount: number;
}

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([
    { id: '1', name: '服飾', productCount: 45 },
    { id: '2', name: '電子產品', productCount: 32 },
    { id: '3', name: '食品', productCount: 28 },
    { id: '4', name: '配件', productCount: 51 },
    { id: '5', name: '居家用品', productCount: 38 }
  ]);

  const handleAddCategory = () => {
    const name = prompt('請輸入新分類名稱：');
    if (name) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name,
        productCount: 0
      };
      setCategories([...categories, newCategory]);
    }
  };

  const handleEditCategory = (category: Category) => {
    const newName = prompt('請輸入新的分類名稱：', category.name);
    if (newName) {
      setCategories(categories.map(c => 
        c.id === category.id ? { ...c, name: newName } : c
      ));
    }
  };

  const handleDeleteCategory = (id: string) => {
    if (window.confirm('確定要刪除此分類嗎？')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

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
        {categories.map(category => (
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
                  onClick={() => handleDeleteCategory(category.id)}
                  title="刪除"
                >
                  <Trash2 className="icon" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManagement;