// pages/admin/components/CategoryProductModal.tsx
import React, { useEffect } from 'react';
import { X, Package } from 'lucide-react';
import '../styles/CategoryProductModal.css';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  status: string;
}

interface Category {
  id: number;
  name: string;
}

interface CategoryProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: Category | null;
  products: Product[];
  loading: boolean;
}

const CategoryProductModal: React.FC<CategoryProductModalProps> = ({
  isOpen,
  onClose,
  category,
  products,
  loading,
}) => {
  // 處理開啟時鎖定背景滾動
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="product-modal-overlay" onClick={onClose}>
      <div 
        className="product-modal-content" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="product-modal-header">
          <h3 className="product-modal-title">
            <Package className="modal-title-icon" />
            {category?.name} - 商品列表
          </h3>
          <button className="product-modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Body (這區塊負責滾動) */}
        <div className="product-modal-body">
          {loading ? (
            <div className="pm-loading-state">載入中...</div>
          ) : products.length === 0 ? (
            <div className="pm-empty-state">
              <Package size={48} className="pm-empty-icon" />
              <p>此分類尚無商品</p>
            </div>
          ) : (
            <div className="pm-list">
              <div className="pm-list-header">
                <span>商品名稱</span>
                <span>價格</span>
                <span>庫存</span>
                <span>狀態</span>
              </div>
              {products.map((product) => (
                <div key={product.id} className="pm-item">
                  <div className="pm-name">{product.name}</div>
                  <div className="pm-price">NT$ {Number(product.price).toLocaleString()}</div>
                  <div className="pm-stock">{product.stock}</div>
                  <div className={`pm-status ${product.status === '上架' ? 'active' : 'inactive'}`}>
                    {product.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="product-modal-footer">
          <span className="pm-count">共 {products.length} 件商品</span>
          <button className="pm-btn-secondary" onClick={onClose}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
};

export default CategoryProductModal;