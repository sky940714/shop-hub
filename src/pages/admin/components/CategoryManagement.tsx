// src/pages/admin/components/CategoryManagement.tsx
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, GripVertical, Eye, X, Upload, ImageIcon } from 'lucide-react';
import CategoryProductModal from './CategoryProductModal';
import { apiFetch } from '../../../utils/api';
import { getImageUrl } from '../../../config'; // 引入圖片工具

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../styles/CategoryManagement.css';

// 📌 更新介面定義，加入 image_url
interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
  sort_order: number;
  is_active: number;
  productCount: number;
  image_url: string | null; 
  created_at: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: string;
}

// 可拖拽的分類卡片組件
const SortableCategory: React.FC<{
  category: Category;
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
  onView: (category: Category) => void;
}> = ({ category, onEdit, onDelete, onView }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`category-card ${isDragging ? 'dragging' : ''}`}
    >
      <div className="category-content">
        <div className="drag-handle" {...attributes} {...listeners}>
          <GripVertical className="drag-icon" />
        </div>
        
        {/* 📌 新增：在清單中顯示分類圖縮圖 */}
        <div className="category-list-thumb">
          {category.image_url ? (
            <img src={getImageUrl(category.image_url)} alt="" />
          ) : (
            <div className="no-image-placeholder"><ImageIcon size={16} /></div>
          )}
        </div>

        <div className="category-info">
          <h3 className="category-name">{category.name}</h3>
          <p className="category-count">商品數量: {category.productCount}</p>
        </div>
        <div className="category-actions">
          <button className="btn-icon-view" onClick={() => onView(category)} title="查看商品"><Eye className="icon" /></button>
          <button className="btn-icon-edit" onClick={() => onEdit(category)} title="編輯"><Edit2 className="icon" /></button>
          <button className="btn-icon-delete" onClick={() => onDelete(category)} title="刪除"><Trash2 className="icon" /></button>
        </div>
      </div>
    </div>
  );
};

const CategoryManagement: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeId, setActiveId] = useState<number | null>(null);
  
  // 彈窗控制狀態
  const [showProductModal, setShowProductModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  // 編輯中的分類資料
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    image_url: '' as string | null
  });
  const [uploading, setUploading] = useState(false);

  const [categoryProducts, setCategoryProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => { fetchCategories(); }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiFetch('/api/categories');
      const data = await response.json();
      if (data.success) setCategories(data.categories);
    } catch (error) {
      setError('無法載入分類列表');
    } finally {
      setLoading(false);
    }
  };

  // 📌 處理圖片上傳至 R2
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await apiFetch('/api/upload/image', {
        method: 'POST',
        body: formData, // apiFetch 會自動處理 Headers
      });

      const data = await response.json();
      if (data.success) {
        setCategoryForm(prev => ({ ...prev, image_url: data.imageUrl }));
      } else {
        alert('上傳失敗：' + data.message);
      }
    } catch (error) {
      alert('圖片上傳發生錯誤');
    } finally {
      setUploading(false);
    }
  };

  // 開啟新增視窗
  const handleAddCategory = () => {
    setSelectedCategory(null);
    setCategoryForm({ name: '', image_url: null });
    setShowEditModal(true);
  };

  // 開啟編輯視窗
  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setCategoryForm({
      name: category.name,
      image_url: category.image_url
    });
    setShowEditModal(true);
  };

  // 儲存分類資料 (新增或更新)
  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      const url = selectedCategory ? `/api/categories/${selectedCategory.id}` : '/api/categories';
      const method = selectedCategory ? 'PUT' : 'POST';

      const response = await apiFetch(url, {
        method,
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          image_url: categoryForm.image_url,
          is_active: 1
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowEditModal(false);
        fetchCategories();
      } else {
        alert(data.message);
      }
    } catch (error) {
      alert('儲存失敗');
    }
  };

  const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as number);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex((cat) => cat.id === active.id);
    const newIndex = categories.findIndex((cat) => cat.id === over.id);
    const newCategories = arrayMove(categories, oldIndex, newIndex);
    const updatedCategories = newCategories.map((cat, index) => ({ ...cat, sort_order: index + 1 }));
    setCategories(updatedCategories);
    
    // 保存排序到伺服器
    try {
      setIsSaving(true);
      await apiFetch('/api/categories/update-order', {
        method: 'PUT',
        body: JSON.stringify({
          categories: updatedCategories.map((cat) => ({ id: cat.id, sort_order: cat.sort_order })),
        }),
      });
    } catch (error) {
      fetchCategories();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (category: Category) => {
    if (!window.confirm(`確定要刪除「${category.name}」分類嗎？`)) return;
    try {
      const response = await apiFetch(`/api/categories/${category.id}`, { method: 'DELETE' });
      const data = await response.json();
      if (data.success) fetchCategories();
      else alert(data.message);
    } catch (error) {
      alert('刪除失敗');
    }
  };

  const handleViewCategory = async (category: Category) => {
    setSelectedCategory(category);
    setShowProductModal(true);
    setProductsLoading(true);
    try {
      const response = await apiFetch(`/api/products/category/${category.id}`);
      const data = await response.json();
      setCategoryProducts(data.success ? data.products : []);
    } catch (error) {
      setCategoryProducts([]);
    } finally {
      setProductsLoading(false);
    }
  };

  if (loading) return <div className="category-management"><div className="loading-state">載入中...</div></div>;

  return (
    <div className="category-management">
      <div className="page-header">
        <div>
          <h2 className="page-title">分類管理</h2>
          {isSaving && <span className="saving-indicator">保存排序中...</span>}
        </div>
        <button className="btn-primary" onClick={handleAddCategory}>
          <Plus className="btn-icon" /> 新增分類
        </button>
      </div>

      <div className="category-list">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <SortableContext items={categories.map((cat) => cat.id)} strategy={verticalListSortingStrategy}>
            {categories.map((category) => (
              <SortableCategory key={category.id} category={category} onEdit={handleEditCategory} onDelete={handleDeleteCategory} onView={handleViewCategory} />
            ))}
          </SortableContext>
          <DragOverlay>
            {activeId ? (
              <div className="category-card dragging">
                <div className="category-content">
                  <div className="drag-handle"><GripVertical className="drag-icon" /></div>
                  <div className="category-info">
                    <h3 className="category-name">{categories.find(cat => cat.id === activeId)?.name}</h3>
                  </div>
                </div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* 📌 新增：分類編輯/新增彈窗 (包含圖片上傳) */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content category-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedCategory ? '編輯分類' : '新增分類'}</h3>
              <button className="close-btn" onClick={() => setShowEditModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleSaveCategory}>
              <div className="modal-body">
                <div className="form-group">
                  <label>分類名稱 *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={categoryForm.name} 
                    onChange={e => setCategoryForm({...categoryForm, name: e.target.value})}
                    placeholder="請輸入分類名稱"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>分類美宣圖 (建議比例 3:1)</label>
                  <div className="category-image-upload">
                    {categoryForm.image_url ? (
                      <div className="image-preview-container">
                        <img src={getImageUrl(categoryForm.image_url)} alt="預覽" className="category-preview" />
                        <button type="button" className="remove-img" onClick={() => setCategoryForm({...categoryForm, image_url: null})}><X size={14} /></button>
                      </div>
                    ) : (
                      <label className="upload-placeholder">
                        <input type="file" accept="image/*" onChange={handleImageUpload} style={{ display: 'none' }} disabled={uploading} />
                        <Upload size={24} />
                        <span>{uploading ? '上傳中...' : '點擊上傳圖片'}</span>
                      </label>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEditModal(false)}>取消</button>
                <button type="submit" className="btn-primary" disabled={uploading}>儲存</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <CategoryProductModal 
        isOpen={showProductModal} 
        onClose={() => setShowProductModal(false)} 
        category={selectedCategory} 
        products={categoryProducts} 
        loading={productsLoading} 
      />
    </div>
  );
};

export default CategoryManagement;