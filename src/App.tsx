// App.tsx
import React, { useEffect, useState } from 'react';
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
import CartPage from './pages/CartPage';

// 結帳相關頁面 - 新增
import CheckoutPage from './pages/checkout/CheckoutPage';
import OrderSuccessPage from './pages/checkout/OrderSuccessPage';
import OrderListPage from './pages/checkout/OrderListPage';
import OrderDetailPage from './pages/checkout/OrderDetailPage';
import PaymentResultPage from './pages/checkout/PaymentResultPage';

// 🟢 新增：導入 iOS 原生推播套件與 API 工具
import { PushNotifications } from '@capacitor/push-notifications';
import { apiFetch } from './utils/api';

interface Toast {
  title: string;
  body: string;
}

function App() {
  const [toast, setToast] = useState<Toast | null>(null);

  const showToast = (title: string, body: string) => {
    setToast({ title, body });
    setTimeout(() => setToast(null), 4000);
  };

  // 🟢 新增：iOS 專屬原生推播權限獲取與監聽
  useEffect(() => {
    // 判斷是否在 iOS App 殼內環境執行（避免一般網頁版模擬編譯時報錯）
    if (typeof window !== 'undefined' && (window as any).Capacitor?.isPluginAvailable('PushNotifications')) {
      
      // 1. 要求 iOS 系統跳出「是否允許通知」的權限視窗
      PushNotifications.requestPermissions().then(result => {
        if (result.receive === 'granted') {
          // 2. 使用者點擊同意後，正式向 APNs/FCM 註冊獲取這台 iPhone 的專屬識別碼
          PushNotifications.register();
        } else {
          console.warn('使用者拒絕了 iOS 推播通知權限');
        }
      });

      // 3. 註冊成功監聽：拿到系統派發的手機 Token
      PushNotifications.addListener('registration', async (token) => {
        console.log('📱 成功取得 iOS 手機 FCM Token:', token.value);
        
        // 將 Token 暫存至本地快取
        localStorage.setItem('fcm_token', token.value);
        
        // 如果使用者目前是登入狀態，立刻同步到後端寫入 MySQL 資料庫
        const loginToken = localStorage.getItem('token');
        if (loginToken) {
          try {
            await apiFetch('/api/members/update-fcm-token', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${loginToken}`
              },
              body: JSON.stringify({ fcmToken: token.value })
            });
            console.log('✅ FCM Token 已同步上傳至 MySQL 會員資料表！');
          } catch (err) {
            console.error('上傳 Token 失敗:', err);
          }
        }
      });

      // 註冊錯誤處理
      PushNotifications.addListener('registrationError', (error) => {
        console.error('iOS 推播註冊錯誤:', error);
      });

      // 4. 監聽 App 開著（前台狀態）時收到通知的行為
      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('🔔 前台收到推播:', notification);
        if (notification.body) {
          showToast(notification.title || '通知', notification.body);
        }
      });

      // 5. 監聽使用者從 iPhone 通知中心「點擊推播」滑入 App 的行為
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('🚀 使用者點擊推播進入 App:', action.notification);
      });
    }
  }, []);

  return (
    <Router>
      <CartProvider>
        {toast && (
          <div style={{
            position: 'fixed', top: '16px', left: '50%', transform: 'translateX(-50%)',
            background: '#1f2937', color: '#fff', borderRadius: '12px',
            padding: '12px 20px', zIndex: 9999, maxWidth: '320px', width: '90%',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)', animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: '4px', fontSize: '14px' }}>{toast.title}</div>
            <div style={{ fontSize: '13px', opacity: 0.9 }}>{toast.body}</div>
          </div>
        )}
        <Routes>
          
          <Route path="/" element={<HomePage />} />
          <Route path="/product/:id" element={<ProductDetailPage />} />
          
          <Route path="/search" element={<SearchPage />} />

          <Route path="/login" element={<LoginPage />} />

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
            path="/cart"
            element={
              <ProtectedRoute>
                <CartPage />
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
      </CartProvider>
    </Router>
  );
}

export default App;