// pages/admin/components/ProductModal.tsx 商品上傳頁面
import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, GripVertical } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../styles/ProductModal.css';

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image: string;
  description: string;
  status: 'active' | 'inactive';
}

// ✅ 可排序的圖片組件
interface SortableImageProps {
  url: string;
  index: number;
  onRemove: (index: number) => void;
}

const SortableImage: React.FC<SortableImageProps> = ({ url, index, onRemove }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: url });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`image-preview-item ${isDragging ? 'dragging' : ''}`}
    >
      {/* 拖曳手把 */}
      <div {...attributes} {...listeners} className="drag-handle">
        <GripVertical size={20} />
      </div>
      
      <img src={url} alt={`預覽 ${index + 1}`} />
      
      <button
        type="button"
        className="remove-image-btn"
        onClick={() => onRemove(index)}
      >
        <Trash2 size={16} />
      </button>
      
      {index === 0 && <span className="main-badge">主圖</span>}
    </div>
  );
};

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onSave: (product: Product) => void;
}

const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onSave }) => {
  const categories = ['服飾', '電子產品', '食品', '配件', '居家用品'];
  const MAX_IMAGES = 8; // ← 加這行
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB ← 加這行

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: '服飾',
    price: 0,
    stock: 0,
    image: '',
    description: '',
    status: 'active'
  });

  // ✅ 拖曳感應器設定
const sensors = useSensors(
  useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  })
);

  const [loading, setLoading] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData(product);
    }
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : value
    }));
  };

  // 處理圖片上傳
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedImages.length + files.length > MAX_IMAGES) {
    alert(`最多只能上傳 ${MAX_IMAGES} 張圖片！目前已有 ${uploadedImages.length} 張`);
    e.target.value = '';
    return;
  }
  for (let i = 0; i < files.length; i++) {
    if (files[i].size > MAX_FILE_SIZE) {
      alert(
        `圖片 ${files[i].name} 太大！\n\n` +
        `檔案大小：${(files[i].size / 1024 / 1024).toFixed(2)} MB\n` +
        `最大限制：5 MB\n\n` +
        `請壓縮後再上傳。`
      );
      e.target.value = '';
      return;
    }
  }

    setUploading(true);

    try {
      const token = localStorage.getItem('token');
      const newImageUrls: string[] = [];

      // 逐一上傳每張圖片
      for (let i = 0; i < files.length; i++) {
        const formData = new FormData();
        formData.append('image', files[i]);

        const response = await fetch('http://45.32.24.240/api/upload/image', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });

        const data = await response.json();

        if (data.success) {
          newImageUrls.push(data.imageUrl);
        } else {
          alert(`圖片 ${files[i].name} 上傳失敗：${data.message}`);
        }
      }

      // 更新已上傳的圖片列表
      setUploadedImages(prev => [...prev, ...newImageUrls]);
      alert('圖片上傳成功！');

    } catch (error) {
      console.error('上傳失敗：', error);
      alert('圖片上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
      e.target.value = ''; // ← 加這行
    }
  };

  // ✅ 處理拖曳排序
const handleDragEnd = (event: any) => {
  const { active, over } = event;

  if (over && active.id !== over.id) {
    setUploadedImages((items) => {
      const oldIndex = items.indexOf(active.id);
      const newIndex = items.indexOf(over.id);
      
      return arrayMove(items, oldIndex, newIndex);
    });
  }
};

  // 刪除圖片（呼叫後端 API）
const handleRemoveImage = async (index: number) => {
  const imageUrl = uploadedImages[index];
  
  console.log('🗑️ 準備刪除圖片：', imageUrl);
  
  try {
    const token = localStorage.getItem('token');

    if (!token) {
      alert('請先登入');
      return;
    }

    // 呼叫後端刪除 API
    const response = await fetch('http://45.32.24.240/api/upload/image', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ imageUrl })
    });

    const data = await response.json();
    console.log('📥 後端回應：', data);

    if (data.success) {
      console.log('✅ 伺服器檔案已刪除');
      
      // 從前端狀態移除
      setUploadedImages(prev => prev.filter((_, i) => i !== index));
      
      // 清空 file input
      const fileInput = document.getElementById('image-upload') as HTMLInputElement;
      if (fileInput) {
        fileInput.value = '';
      }
      
    } else {
      console.log('❌ 刪除失敗：', data.message);
      alert('刪除失敗：' + data.message);
    }

  } catch (error) {
    console.error('❌ 刪除圖片時發生錯誤：', error);
    alert('刪除失敗，請檢查網路連線');
  }
};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.price || formData.stock === undefined) {
      alert('請填寫所有必填欄位');
      return;
    }

    if (uploadedImages.length === 0) {
      alert('請至少上傳一張商品圖片');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('請先登入');
        setLoading(false);
        return;
      }

      // 轉換狀態：active -> 上架, inactive -> 下架
      const status = formData.status === 'active' ? '上架' : '下架';

      // 準備要送到後端的資料
      const productData = {
        name: formData.name,
        description: formData.description || '',
        price: formData.price,
        stock: formData.stock,
        category_id: getCategoryId(formData.category || '服飾'),
        status: status,
        imageUrls: uploadedImages  // ← 傳送圖片 URL 陣列
      };

      let response;

      if (product) {
        // 更新商品
        response = await fetch(`http://45.32.24.240/api/products/${product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(productData)
        });
      } else {
        // 新增商品
        response = await fetch('http://45.32.24.240/api/products', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(productData)
        });
      }

      const data = await response.json();

      if (data.success) {
        alert(product ? '商品更新成功！' : '商品新增成功！');
        onSave(formData as Product);
        onClose();
        window.location.reload();
      } else {
        alert(data.message || '操作失敗');
      }

    } catch (error) {
      console.error('錯誤：', error);
      alert('操作失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  // 將分類名稱轉換為分類 ID
  const getCategoryId = (categoryName: string): number => {
    const categoryMap: { [key: string]: number } = {
      '服飾': 1,
      '電子產品': 2,
      '食品': 3,
      '配件': 4,
      '居家用品': 5
    };
    return categoryMap[categoryName] || 1;
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">
            {product ? '編輯商品' : '新增商品'}
          </h3>
          <button className="modal-close" onClick={onClose}>
            <X className="icon" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-body">
            <div className="form-group">
              <label className="form-label">
                商品名稱 <span className="required">*</span>
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="form-input"
                placeholder="請輸入商品名稱"
                required
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                分類 <span className="required">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
                required
                disabled={loading}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">
                  價格 (NT$) <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="0"
                  min="0"
                  required
                  disabled={loading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  庫存 <span className="required">*</span>
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="0"
                  min="0"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            {/* 圖片上傳區域 */}
            <div className="form-group">
              <label className="form-label">
                商品圖片 <span className="required">*</span>
              </label>
              
              <div className="image-upload-area">
            <input
              type="file"
              id="image-upload"
              accept="image/*"
              multiple
              onChange={handleImageUpload}
              style={{ display: 'none' }}
              disabled={uploading || loading || uploadedImages.length >= MAX_IMAGES}
            />
  
              <label 
                htmlFor="image-upload" 
                className="upload-button"
                style={{
                  cursor: uploadedImages.length >= MAX_IMAGES ? 'not-allowed' : 'pointer',
                  opacity: uploadedImages.length >= MAX_IMAGES ? 0.5 : 1
                }}
                          >
                <Upload className="upload-icon" />
                {uploading ? '上傳中...' : 
                uploadedImages.length >= MAX_IMAGES ? '已達上限' :
                '點擊上傳圖片（可多選）'}
              </label>
  
                <p className="upload-hint">
                  支援 JPG, PNG 格式，最多 8 張，每張限制 5MB
                  {uploadedImages.length > 0 && ` (已上傳 ${uploadedImages.length}/8)`}
                </p>
              </div>

              {/* ✅ 已上傳的圖片預覽（支援拖曳排序） */}
                {uploadedImages.length > 0 && (
                  <div className="uploaded-images-container">
                    <p className="drag-hint">💡 拖曳圖片可調整順序，第一張為主圖</p>
                    
                    <DndContext 
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext 
                        items={uploadedImages}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="uploaded-images">
                          {uploadedImages.map((url, index) => (
                            <SortableImage
                              key={url}
                              url={url}
                              index={index}
                              onRemove={handleRemoveImage}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
            </div>

            <div className="form-group">
              <label className="form-label">商品描述</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={4}
                className="form-textarea"
                placeholder="請輸入商品描述..."
                disabled={loading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">商品狀態</label>
              <div className="radio-group">
                <label className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <span>上架</span>
                </label>
                <label className="radio-label">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={handleChange}
                    disabled={loading}
                  />
                  <span>下架</span>
                </label>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              取消
            </button>
            <button type="submit" className="btn-primary" disabled={loading || uploading}>
              {loading ? '處理中...' : product ? '更新' : '新增'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductModal;