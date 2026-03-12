// pages/admin/components/ProductModal.tsx 商品上傳頁面
import React, { useState, useEffect } from 'react';
import { X, Upload, Trash2, GripVertical, Plus } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, useSortable, horizontalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import '../styles/ProductModal.css';
import { apiFetch } from '../../../utils/api';

// ⭐ 新增：規格介面
interface ProductVariant {
  name: string;
  price: number;
  stock: number;
}

// ⭐ 新增：分類介面
interface Category {
  id: number;
  name: string;
  parent_id: number | null;
  level: number;
  is_active: number;
  productCount: number;
}

interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  variantCount: number;
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
  const MAX_IMAGES = 8;
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const MAX_VARIANTS = 10;
  const MAX_CATEGORIES = 5;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  });

  // ⭐ 新增：規格開關狀態
  const [hasVariants, setHasVariants] = useState(false);
  
  // ⭐ 新增：單一商品的價格和庫存
  const [singlePrice, setSinglePrice] = useState<number>(0);
  const [singleStock, setSingleStock] = useState<number>(0);

  // ⭐ 原有：多規格狀態
  const [variants, setVariants] = useState<ProductVariant[]>([
    { name: '', price: 0, stock: 0 }
  ]);

  // ⭐ 新增：分類相關狀態
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

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

  // ⭐ 載入分類列表
  const fetchCategories = async () => {
    try {
      const response = await apiFetch('/api/categories');
      const data = await response.json();

      if (data.success) {
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('載入分類失敗：', error);
    }
  };

  // ⭐ 載入商品資料（編輯模式）
  const fetchProductData = async (productId: string) => {
    try {
      const token = localStorage.getItem('token');
      
      const response = await apiFetch(`/api/products/${productId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        const productData = data.product;
        
        // 設定基本資訊
        setFormData({
          name: productData.name,
          description: productData.description || '',
          status: productData.status === '上架' ? 'active' : 'inactive'
        });

        // ⭐ 修改：判斷是單一商品還是多規格商品
        if (productData.variants && productData.variants.length > 0) {
          // 如果只有一個規格且名稱是「標準款」，視為單一商品
          if (productData.variants.length === 1 && productData.variants[0].variant_name === '標準款') {
            setHasVariants(false);
            setSinglePrice(parseFloat(productData.variants[0].price));
            setSingleStock(productData.variants[0].stock);
          } else {
            // 多規格商品
            setHasVariants(true);
            setVariants(productData.variants.map((v: any) => ({
              name: v.variant_name,
              price: parseFloat(v.price),
              stock: v.stock
            })));
          }
        }

        // 設定分類
        if (productData.categories && productData.categories.length > 0) {
          setSelectedCategories(productData.categories.map((c: any) => c.id));
        }

        // 設定圖片
        if (productData.images && productData.images.length > 0) {
          const imageUrls = productData.images
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((img: any) => img.image_url);
          setUploadedImages(imageUrls);
        }
      }
    } catch (error) {
      console.error('載入商品資料失敗：', error);
    }
  };

  useEffect(() => {
    fetchCategories();

    if (product) {
      fetchProductData(product.id);
    } else {
      // 新增模式：重置所有狀態
      setFormData({ name: '', description: '', status: 'active' });
      setHasVariants(false);  // ⭐ 新增：預設不啟用規格
      setSinglePrice(0);
      setSingleStock(0);
      setVariants([{ name: '', price: 0, stock: 0 }]);
      setSelectedCategories([]);
      setUploadedImages([]);
    }
  }, [product]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // ⭐ 處理規格變更
  const handleVariantChange = (index: number, field: keyof ProductVariant, value: string | number) => {
    const newVariants = [...variants];
    newVariants[index] = {
      ...newVariants[index],
      [field]: field === 'name' ? value : Number(value)
    };
    setVariants(newVariants);
  };

  // ⭐ 新增規格
  const handleAddVariant = () => {
    if (variants.length >= MAX_VARIANTS) {
      alert(`最多只能新增 ${MAX_VARIANTS} 個規格`);
      return;
    }
    setVariants([...variants, { name: '', price: 0, stock: 0 }]);
  };

  // ⭐ 刪除規格
  const handleRemoveVariant = (index: number) => {
    if (variants.length === 1) {
      alert('至少需要保留一個規格');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  // ⭐ 處理分類選擇
  const handleCategoryToggle = (categoryId: number) => {
    if (selectedCategories.includes(categoryId)) {
      setSelectedCategories(selectedCategories.filter(id => id !== categoryId));
    } else {
      if (selectedCategories.length >= MAX_CATEGORIES) {
        alert(`最多只能選擇 ${MAX_CATEGORIES} 個分類`);
        return;
      }
      setSelectedCategories([...selectedCategories, categoryId]);
    }
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
      
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('images', file);
      });

      const response = await apiFetch('/api/upload/images', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (data.success) {
        setUploadedImages(prev => [...prev, ...data.imageUrls]);
        alert('圖片上傳成功！');
      } else {
        alert(`上傳失敗：${data.message}`);
      }

    } catch (error) {
      console.error('上傳失敗：', error);
      alert('圖片上傳失敗，請稍後再試');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // 處理拖曳排序
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

  // 刪除圖片
  const handleRemoveImage = async (index: number) => {
    const imageUrl = uploadedImages[index];
    
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        alert('請先登入');
        return;
      }

      const response = await apiFetch('/api/upload/image', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ imageUrl })
      });

      const data = await response.json();

      if (data.success) {
        setUploadedImages(prev => prev.filter((_, i) => i !== index));
        
        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
        if (fileInput) {
          fileInput.value = '';
        }
      } else {
        alert('刪除失敗：' + data.message);
      }

    } catch (error) {
      console.error('刪除圖片時發生錯誤：', error);
      alert('刪除失敗，請檢查網路連線');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 驗證商品名稱
    if (!formData.name) {
      alert('請填寫商品名稱');
      return;
    }

    // ⭐ 修改：根據規格開關驗證
    if (!hasVariants) {
      // 單一商品驗證
      if (!singlePrice || singlePrice <= 0) {
        alert('請填寫商品價格（必須大於 0）');
        return;
      }
      if (singleStock < 0) {
        alert('庫存數量不能為負數');
        return;
      }
    } else {
      // 多規格驗證
      for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (!v.name || v.price === undefined || v.stock === undefined) {
          alert(`請填寫規格 ${i + 1} 的所有欄位`);
          return;
        }
        if (v.price < 0 || v.stock < 0) {
          alert(`規格 ${i + 1} 的價格和庫存不能為負數`);
          return;
        }
      }
    }

    // 驗證分類
    if (selectedCategories.length === 0) {
      alert('請至少選擇一個分類');
      return;
    }

    // 驗證圖片
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

      // ⭐ 修改：根據規格開關準備資料
      const productData = {
        name: formData.name,
        description: formData.description || '',
        variants: hasVariants 
          ? variants  // 多規格：使用 variants 陣列
          : [{ name: '標準款', price: singlePrice, stock: singleStock }],  // 單一商品：轉成一個規格
        categoryIds: selectedCategories,
        status: formData.status === 'active' ? '上架' : '下架',
        imageUrls: uploadedImages
      };

      let response;

      if (product) {
        // 更新商品
        response = await apiFetch(`/api/products/${product.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(productData)
        });
      } else {
        // 新增商品
        response = await apiFetch('/api/products', {
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
        onSave(formData as any);
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
            {/* 商品名稱 */}
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
                placeholder="請輸入商品名稱（例如：純棉T恤、USB充電頭）"
                required
                disabled={loading}
              />
            </div>

            {/* ⭐ 新增：規格切換區域 */}
            <div className="form-group">
              <label className="form-label">
                商品規格 <span className="required">*</span>
              </label>
              
              {/* ⭐ 規格開關 */}
              <label className="variant-toggle-checkbox">
                <input
                  type="checkbox"
                  checked={hasVariants}
                  onChange={(e) => setHasVariants(e.target.checked)}
                  disabled={loading}
                />
                <span>此商品有多種規格（如顏色、尺寸）</span>
              </label>

              {/* ⭐ 條件渲染：單一商品 or 多規格 */}
              {!hasVariants ? (
                /* 單一商品：顯示價格和庫存輸入框 */
                <div className="single-product-fields">
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">
                        商品價格 <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        value={singlePrice}
                        onChange={(e) => setSinglePrice(Number(e.target.value))}
                        className="form-input"
                        placeholder="請輸入商品價格（例如：299）"
                        min="0"
                        step="0.01"
                        required
                        disabled={loading}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">
                        商品庫存 <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        value={singleStock}
                        onChange={(e) => setSingleStock(Number(e.target.value))}
                        className="form-input"
                        placeholder="請輸入庫存數量（例如：100）"
                        min="0"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* 多規格：顯示規格管理介面 */
                <div className="variants-container">
                  <div className="variant-hint">
                    💡 提示：為商品新增不同的規格選項（例如：黑色-M、白色-L），最多 {MAX_VARIANTS} 個
                  </div>

                  {variants.map((variant, index) => (
                    <div key={index} className="variant-item">
                      <div className="variant-header">
                        <span className="variant-label">規格 {index + 1}</span>
                        {variants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveVariant(index)}
                            className="remove-variant-btn"
                            disabled={loading}
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                      
                      <div className="variant-fields">
                        <input
                          type="text"
                          placeholder="規格名稱（例如：黑色-M、紅色-L、均碼）"
                          value={variant.name}
                          onChange={(e) => handleVariantChange(index, 'name', e.target.value)}
                          className="form-input"
                          required
                          disabled={loading}
                        />
                        <input
                          type="number"
                          placeholder="價格（新台幣）"
                          value={variant.price}
                          onChange={(e) => handleVariantChange(index, 'price', e.target.value)}
                          className="form-input"
                          min="0"
                          step="0.01"
                          required
                          disabled={loading}
                        />
                        <input
                          type="number"
                          placeholder="庫存數量"
                          value={variant.stock}
                          onChange={(e) => handleVariantChange(index, 'stock', e.target.value)}
                          className="form-input"
                          min="0"
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                  ))}
                  
                  {variants.length < MAX_VARIANTS && (
                    <button
                      type="button"
                      onClick={handleAddVariant}
                      className="add-variant-btn"
                      disabled={loading}
                    >
                      <Plus size={16} />
                      新增規格
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ⭐ 新增：多分類選擇 */}
            <div className="form-group">
              <label className="form-label">
                商品分類 <span className="required">*</span>
                <span style={{ fontSize: '0.875rem', color: '#6b7280', marginLeft: '0.5rem' }}>
                  （最多選 {MAX_CATEGORIES} 個，已選 {selectedCategories.length}/{MAX_CATEGORIES}）
                </span>
              </label>
              
              <div className="categories-container">
                {categories.map(category => (
                  <label key={category.id} className="category-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(category.id)}
                      onChange={() => handleCategoryToggle(category.id)}
                      disabled={loading || (!selectedCategories.includes(category.id) && selectedCategories.length >= MAX_CATEGORIES)}
                    />
                    <span>{category.name}</span>
                  </label>
                ))}
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

            {/* 商品描述 */}
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

            {/* 商品狀態 */}
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