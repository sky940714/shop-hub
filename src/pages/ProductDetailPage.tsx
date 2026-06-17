import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, ArrowLeft, Star, Heart, Package, RotateCcw, ShieldCheck, ChevronRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Thumbs } from 'swiper/modules';
import { useCart } from '../context/CartContext';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';
import 'swiper/css/thumbs';
import './ProductDetailPage.css';
import { apiFetch } from '../utils/api';
import { API_BASE_URL, getImageUrl } from '../config';

interface ProductVariant {
  id: number;
  product_id: number;
  variant_name: string;
  price: number;
  stock: number;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  description: string;
  image_url: string;
  category_id: number;
  status: string;
  category_name?: string;
  variants?: ProductVariant[];
  images?: Array<{
    id: number;
    product_id: number;
    image_url: string;
    sort_order: number;
    is_main: number;
  }>;
}

interface RelatedProduct {
  id: number;
  name: string;
  price: string | number;
  main_image: string;
}

interface ToastMsg {
  msg: string;
  type: 'success' | 'error' | 'info';
}

const ProductDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [thumbsSwiper, setThumbsSwiper] = useState<any>(null);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const [toast, setToast] = useState<ToastMsg | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);

  const actionRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string, type: ToastMsg['type'] = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  useEffect(() => {
    const loadProduct = async () => {
      // 切換商品時重置狀態
      setCurrentSlide(0);
      setLoading(true);
      setRelatedProducts([]);
      setShowStickyBar(false);
      window.scrollTo(0, 0);

      try {
        const response = await apiFetch(`${API_BASE_URL}/api/products/${id}`);
        const data = await response.json();

        if (data.success) {
          setProduct(data.product);

          if (data.product.variants && data.product.variants.length > 0) {
            const firstAvailable = data.product.variants.find(
              (v: ProductVariant) => v.stock > 0
            );
            setSelectedVariant(firstAvailable || data.product.variants[0]);
          } else {
            setSelectedVariant(null);
          }

          // 收藏狀態
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const wRes = await apiFetch('/api/wishlist');
              const wData = await wRes.json();
              if (wData.success) {
                setIsWishlisted(wData.data.some((item: any) => item.product_id === data.product.id));
              }
            } catch {}
          }

          // 同類商品
          try {
            const relRes = await apiFetch(`${API_BASE_URL}/api/products/category/${data.product.category_id}`);
            const relData = await relRes.json();
            if (relData.success) {
              setRelatedProducts(
                relData.products
                  .filter((p: any) => p.id !== data.product.id)
                  .slice(0, 12)
              );
            }
          } catch {}
        }
      } catch (error) {
        console.error('讀取商品失敗：', error);
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [id]);

  useEffect(() => {
    const el = actionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowStickyBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [product]);

  const toggleWishlist = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      showToast('請先登入才能收藏', 'info');
      return;
    }
    try {
      if (isWishlisted) {
        await apiFetch(`/api/wishlist/${product!.id}`, { method: 'DELETE' });
        setIsWishlisted(false);
        showToast('已移除收藏', 'info');
      } else {
        await apiFetch('/api/wishlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: product!.id }),
        });
        setIsWishlisted(true);
        showToast('已加入收藏！');
      }
    } catch {
      showToast('操作失敗，請稍後再試', 'error');
    }
  };

  const handleVariantSelect = (variant: ProductVariant) => {
    setSelectedVariant(variant);
    setQuantity(1);
  };

  const handleAddToCart = async () => {
    if (!product) return;
    if (product.variants && product.variants.length > 1 && !selectedVariant) {
      showToast('請選擇商品規格', 'error');
      return;
    }
    try {
      await addToCart(product.id, quantity, selectedVariant?.id);
      showToast('已加入購物車！');
      setQuantity(1);
    } catch {
      showToast('加入購物車失敗，請稍後再試', 'error');
    }
  };

  const handleBuyNow = () => {
    if (!product) return;
    if (product.variants && product.variants.length > 1 && !selectedVariant) {
      showToast('請選擇商品規格', 'error');
      return;
    }
    navigate('/checkout', {
      state: {
        directBuy: true,
        items: [{
          cart_item_id: 0,
          product_id: product.id,
          variant_id: selectedVariant?.id,
          variant_name: selectedVariant?.variant_name,
          name: product.name,
          price: selectedVariant?.price || product.price,
          quantity,
          image_url: getImageUrl(product.image_url),
        }],
      },
    });
  };

  const increaseQuantity = () => {
    const maxStock = selectedVariant?.stock || product?.stock || 0;
    if (quantity < maxStock) setQuantity(quantity + 1);
  };

  const decreaseQuantity = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const currentPrice = selectedVariant?.price || product?.price || 0;
  const totalImages = product?.images && product.images.length > 0 ? product.images.length : 1;
  const soldCount = (selectedVariant?.stock || product?.stock || 0) > 100
    ? '100+'
    : (selectedVariant?.stock || product?.stock || 0);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">載入中...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="error-container">
        <div className="error">找不到商品</div>
        <button onClick={() => navigate(-1)} className="back-home-btn">返回</button>
      </div>
    );
  }

  return (
    <div className="product-detail-page">
      {toast && (
        <div className={`detail-toast detail-toast--${toast.type}`}>{toast.msg}</div>
      )}

      {/* 頂部列：返回（圖示）+ 收藏 */}
      <div className="detail-top-bar">
        <button className="back-button" onClick={() => navigate(-1)} aria-label="返回">
          <ArrowLeft size={17} />
        </button>
        <button
          className={`wishlist-toggle-btn${isWishlisted ? ' active' : ''}`}
          onClick={toggleWishlist}
          aria-label="收藏"
        >
          <Heart size={17} fill={isWishlisted ? '#2563eb' : 'none'} />
        </button>
      </div>

      <div className="product-detail-container">
        {/* 左側圖片區 */}
        <div className="product-image-section">
          <div className="main-swiper-wrapper">
            <Swiper
              modules={[Navigation, Pagination, Thumbs]}
              navigation
              pagination={{ clickable: true }}
              thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
              className="main-swiper"
              style={{ maxWidth: '100%', width: '100%' }}
              onActiveIndexChange={(swiper: any) => setCurrentSlide(swiper.activeIndex)}
            >
              {product.images && product.images.length > 0 ? (
                product.images.map((img, index) => (
                  <SwiperSlide key={img.id || index}>
                    <img
                      src={getImageUrl(img.image_url)}
                      alt={`${product.name} - 圖片 ${index + 1}`}
                      className="main-product-image"
                      loading={index === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                    />
                  </SwiperSlide>
                ))
              ) : (
                <SwiperSlide>
                  <img
                    src={getImageUrl(product.image_url)}
                    alt={product.name}
                    className="main-product-image"
                    loading="eager"
                    decoding="async"
                  />
                </SwiperSlide>
              )}
            </Swiper>
            <div className="image-counter">{currentSlide + 1} / {totalImages}</div>
          </div>

          {product.images && product.images.length > 1 && (
            <Swiper
              onSwiper={setThumbsSwiper}
              modules={[Thumbs]}
              spaceBetween={10}
              slidesPerView={4}
              watchSlidesProgress
              className="thumbs-swiper"
              style={{ maxWidth: '100%', width: '100%' }}
            >
              {product.images.map((img, index) => (
                <SwiperSlide key={img.id || index}>
                  <img
                    src={getImageUrl(img.image_url)}
                    alt={`縮圖 ${index + 1}`}
                    className="thumb-image"
                    loading="lazy"
                    decoding="async"
                  />
                </SwiperSlide>
              ))}
            </Swiper>
          )}
        </div>

        {/* 右側資訊區 */}
        <div className="product-info-section">
          <h1 className="product-title">{product.name}</h1>

          <div className="price-meta-row">
            <div className="price-section">
              <span className="price-label">NT$</span>
              <span className="price-value">{currentPrice.toLocaleString()}</span>
            </div>
            <div className="sold-info">
              <div className="stars-mini">
                <Star fill="#fbbf24" color="#fbbf24" size={13} />
                <span>4.5</span>
              </div>
              <span className="sold-count">已售出 {soldCount}</span>
            </div>
          </div>

          <div className="service-rows">
            <div className="service-row">
              <Package size={15} className="service-icon" />
              <span className="service-label">配送</span>
              <span className="service-value">預計 2–5 個工作天送達</span>
              <ChevronRight size={15} className="service-arrow" />
            </div>
            <div className="service-row">
              <RotateCcw size={15} className="service-icon" />
              <span className="service-label">退換</span>
              <span className="service-value">7 天鑑賞期，支援退換貨</span>
              <ChevronRight size={15} className="service-arrow" />
            </div>
            <div className="service-row">
              <ShieldCheck size={15} className="service-icon" />
              <span className="service-label">保障</span>
              <span className="service-value">付款後問題可申請全額退款</span>
              <ChevronRight size={15} className="service-arrow" />
            </div>
          </div>

          {product.variants && product.variants.length > 1 && (
            <div className="variant-selector">
              <h3 className="section-title">規格</h3>
              <div className="variant-options">
                {product.variants.map((variant) => (
                  <button
                    key={variant.id}
                    className={`variant-option${selectedVariant?.id === variant.id ? ' selected' : ''}${variant.stock === 0 ? ' sold-out' : ''}`}
                    onClick={() => handleVariantSelect(variant)}
                    disabled={variant.stock === 0}
                  >
                    <div className="variant-name">{variant.variant_name}</div>
                    <div className="variant-info">
                      <span className="variant-price">NT$ {variant.price.toLocaleString()}</span>
                      <span className="variant-stock">庫存 {variant.stock}</span>
                    </div>
                    {variant.stock === 0 && <div className="sold-out-badge">售罄</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="description-section">
            <h3 className="section-title">商品描述</h3>
            <p className={`description-text ${showFullDescription ? 'expanded' : 'collapsed'}`}>
              {product.description || '暫無描述'}
            </p>
            {product.description && product.description.length > 100 && (
              <button className="show-more-btn" onClick={() => setShowFullDescription(!showFullDescription)}>
                {showFullDescription ? '收起 ▲' : '顯示更多 ▼'}
              </button>
            )}
          </div>

          <div className="stock-section">
            <span className="stock-label">庫存：</span>
            <span className="stock-value">{selectedVariant?.stock || product.stock} 件</span>
          </div>

          <div className="quantity-section">
            <span className="quantity-label">數量：</span>
            <div className="quantity-controls">
              <button className="quantity-button" onClick={decreaseQuantity} disabled={quantity <= 1}>−</button>
              <input type="number" value={quantity} readOnly className="quantity-input" />
              <button className="quantity-button" onClick={increaseQuantity} disabled={quantity >= (selectedVariant?.stock || product.stock)}>+</button>
            </div>
          </div>

          <div className="action-buttons" ref={actionRef}>
            <button className="add-to-cart-btn" onClick={handleAddToCart}>
              <ShoppingCart size={20} />
              加入購物車
            </button>
            <button className="buy-now-btn" onClick={handleBuyNow}>
              立即購買
            </button>
          </div>
        </div>
      </div>

      {/* 同類商品 */}
      {relatedProducts.length > 0 && (
        <div className="related-section">
          <h3 className="related-title">同類商品</h3>
          <div className="related-scroll">
            {relatedProducts.map((p) => (
              <div
                key={p.id}
                className="related-card"
                onClick={() => navigate(`/product/${p.id}`)}
              >
                <div className="related-img-wrap">
                  <img
                    src={getImageUrl(p.main_image)}
                    alt={p.name}
                    className="related-img"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="related-info">
                  <p className="related-name">{p.name}</p>
                  <p className="related-price">NT$ {parseFloat(String(p.price)).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky 底部購買欄（手機） */}
      {showStickyBar && (
        <div className="sticky-buy-bar">
          <div className="sticky-price">
            <span className="sticky-price-currency">NT$</span>
            <span className="sticky-price-value">{currentPrice.toLocaleString()}</span>
          </div>
          <div className="sticky-actions">
            <button className="sticky-cart-btn" onClick={handleAddToCart}>
              <ShoppingCart size={16} />
              加入購物車
            </button>
            <button className="sticky-buy-btn" onClick={handleBuyNow}>立即購買</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductDetailPage;
