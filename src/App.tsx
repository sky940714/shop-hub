// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import HomePage from './pages/HomePage';
import MemberPage from './pages/MemberPage';
import WishlistPage from './pages/WishlistPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProductDetailPage from './pages/ProductDetailPage';

// 結帳相關頁面 - 新增
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderSuccessPage from './pages/checkout/OrderSuccessPage';
import OrderListPage from './pages/checkout/OrderListPage';
import OrderDetailPage from './pages/checkout/OrderDetailPage';
import PaymentResultPage from './pages/checkout/PaymentResultPage';

function App() {
  return (
    <CartProvider>
      <Router>
        <Routes>
          {/* 首頁 - 公開訪問 */}
          <Route path="/" element={<HomePage />} />

          {/* 商品詳情頁 - 公開訪問 */}
          <Route path="/product/:id" element={<ProductDetailPage />} />

          {/* 登入頁面 */}
          <Route path="/login" element={<LoginPage />} />

          {/* 前台路由 - 需要登入 */}
          <Route
            path="/member"
            element={
              <ProtectedRoute>
                <MemberPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wishlist"
            element={
              <ProtectedRoute>
                <WishlistPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/search"
            element={
              <ProtectedRoute>
                <SearchPage />
              </ProtectedRoute>
            }
          />

          {/* 結帳相關路由 - 需要登入 - 新增區塊 */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/order-success/:orderNo"
            element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout/orders"
            element={
              <ProtectedRoute>
                <OrderListPage />
              </ProtectedRoute>
            }
          />
         <Route
            path="/checkout/orders/:orderNo"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          {/* 新增：綠界付款完成後的跳轉頁面 */}
          <Route
            path="/order/result"
            element={
              <ProtectedRoute>
                <PaymentResultPage />
              </ProtectedRoute>
            }
          />

          {/* 後台路由 - 需要管理員權限 */}
          <Route
            path="/admin/*"
            element={
              <ProtectedRoute requireAdmin={true}>
                <AdminLayout />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </CartProvider>
  );
}

export default App;