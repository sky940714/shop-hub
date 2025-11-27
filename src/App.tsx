// App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import HomePage from './pages/HomePage';
import MemberPage from './pages/MemberPage';
import WishlistPage from './pages/WishlistPage';
import SearchPage from './pages/SearchPage';
import LoginPage from './pages/LoginPage';
import AdminLayout from './pages/admin/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ProductDetailPage from './pages/ProductDetailPage';
import { CartProvider } from './context/CartContext'; 

function App() {
  return (
    <Router>
      <Routes>
        {/* 首頁 - 公開訪問 */}
        <Route path="/" element={<HomePage />} />

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
  );
}

export default App;