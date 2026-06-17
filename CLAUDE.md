# ShopHub (安鑫購物) — CLAUDE.md

## 專案概覽

一個全端電商平台，品牌名稱「安鑫購物」，網域 `anxinshophub.com`。
同時支援**網頁版**與**手機 App 版**（iOS / Android），後者透過 Capacitor 打包。

---

## 技術架構

### 前端 (`/` 根目錄)
- **React 19 + TypeScript**，使用 Create React App (CRA) 建構
- **React Router v7** 管理路由
- **Capacitor 8** 打包成 iOS / Android 原生 App
- CSS Modules（每個元件有對應的 `.css` 檔）
- 圖示庫：`lucide-react`；輪播：`swiper`；拖曳排序：`@dnd-kit`

### 後端 (`/backend`)
- **Node.js + Express 5**
- **MySQL 2** 資料庫，透過 Connection Pool 連線
- **JWT** 認證（`jsonwebtoken` + `bcryptjs`）
- **Cloudflare R2**（S3 相容）儲存商品圖片
- **Firebase Admin SDK** 發送 iOS / Android 推播通知（FCM）
- 圖片上傳：`multer`

### 行動端
- `android/` — Capacitor Android 專案（Gradle）
- `ios/` — Capacitor iOS 專案（Xcode）

---

## 本地開發啟動流程（依序執行）

### 步驟 1：建立 SSH Tunnel 連線遠端資料庫
```bash
# MySQL 實際跑在遠端 VPS (45.32.24.240)，本地透過 SSH tunnel 存取
# 執行後保持這個視窗開著，不要關閉
ssh -N -L 3307:127.0.0.1:3306 root@45.32.24.240
```
> `backend/.env` 的 `DB_PORT` 應設為 `3307`，`DB_HOST` 設為 `127.0.0.1`

### 步驟 2：啟動後端
```bash
cd C:\Users\jerry\shop-hub\backend
npm start
# 後端跑在 http://localhost:5001
```

### 步驟 3：啟動前端
```bash
# 根目錄
npm start
# 前端跑在 http://localhost:3000，自動 proxy 到 localhost:5001
```

---

## 打包上架流程

```bash
# 步驟 1：打包前端
npm run build

# 步驟 2：同步到 iOS 原生專案
npx cap sync ios

# （Android 同步用）
npx cap sync android
```

> 打包前確認 `src/config.ts` 的 `IS_DEV_MODE = false`

---

## 目錄結構

```
shop-hub/
├── src/
│   ├── App.tsx                  # 路由定義、iOS 推播初始化
│   ├── config.ts                # API_BASE_URL、getImageUrl 工具
│   ├── utils/api.ts             # apiFetch — 帶 JWT token 的 fetch 封裝
│   ├── context/CartContext.tsx  # 全域購物車狀態
│   ├── components/              # BottomNav、ProtectedRoute
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── ProductDetailPage.tsx
│   │   ├── CartPage.tsx
│   │   ├── SearchPage.tsx
│   │   ├── WishlistPage.tsx
│   │   ├── MemberPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── checkout/            # CheckoutPage、OrderList/Detail/Success、PaymentResult
│   │   └── admin/               # 後台管理介面
│   │       └── components/      # Dashboard、ProductManagement、OrderManagement、
│   │                            # MemberManagement、CategoryManagement、
│   │                            # ReturnManagement、ReturnSettings、MainSettings
│   └── types/index.ts
│
├── backend/
│   ├── server.js                # Express 入口
│   ├── config/
│   │   ├── database.js          # MySQL pool + query 工具
│   │   ├── r2.js                # Cloudflare R2 上傳/刪除
│   │   └── serviceAccountKey.json  # Firebase 私密金鑰（不進 Git）
│   ├── middleware/
│   │   ├── auth.js              # protect（JWT）、admin（role 檢查）
│   │   └── errorHandler.js
│   ├── models/                  # Product、ProductVariant、ProductImage、
│   │                            # ProductCategoryRelation、User、Wishlist
│   ├── controllers/
│   │   ├── ecpayController.js   # 綠界金流 + 物流 + FCM 推播
│   │   └── ...
│   ├── routes/                  # 每支 API 一個檔案
│   └── utils/
│       ├── ecpay.js             # 綠界簽名/參數工具
│       └── generateToken.js
│
├── capacitor.config.ts          # App ID: com.anxin.shophub
├── android/                     # Android 原生專案
└── ios/                         # iOS 原生專案
```

---

## API 路由總覽

| 前綴 | 說明 |
|------|------|
| `/api/auth` | 登入、註冊 |
| `/api/products` | 商品 CRUD |
| `/api/categories` | 分類管理 |
| `/api/cart` | 購物車 |
| `/api/orders` | 訂單建立、查詢、後台管理 |
| `/api/ecpay` | 綠界金流（付款、回調）、物流（門市地圖、出貨單、物流回調）|
| `/api/members` | 會員資料、FCM Token 更新 |
| `/api/wishlist` | 願望清單 |
| `/api/returns` | 退貨申請（前台）、退貨審核（後台）|
| `/api/banners` | 首頁輪播橫幅 |
| `/api/settings` | 運費設定、退貨方式設定（7-11/全家/萊爾富/宅配）|
| `/api/upload` | 圖片上傳（到 R2）|
| `/api/pickup-stores` | 超商取貨門市 |

---

## 重要設計細節

### 認證
- JWT token 存在 `localStorage('token')`
- `protect` middleware 驗證 JWT，將 user 掛在 `req.user`
- `admin` middleware 確認 `req.user.role === 'admin'`
- 前端 `ProtectedRoute` 元件控制頁面存取；後台另有 `requireAdmin` 參數

### 圖片儲存
- 上傳後存到 **Cloudflare R2**，回傳完整 HTTPS URL
- `backend/public/uploads/` 為舊/備用本地路徑

### 推播通知
- iOS/Android App 啟動時在 `App.tsx` 透過 `@capacitor/push-notifications` 取得 FCM Token
- Token 存入 MySQL 的 `members` 表
- 綠界物流狀態更新時，後端透過 Firebase Admin SDK 發送推播

### 金流（綠界 ECPay）
- 付款流程：前端 → `/api/ecpay/checkout` → 綠界付款頁 → 回調 `/api/ecpay/callback`
- 物流：App 透過中繼頁 `/api/ecpay/map-page` 開啟門市地圖
- App 付款結束後透過 `/api/ecpay/payment-app-redirect` 導回 App

### API 請求（前端）
- 所有請求透過 `src/utils/api.ts` 的 `apiFetch` 函數，自動帶 JWT header
- 開發時 CRA proxy 轉發到 `localhost:5001`；App 或正式環境直連 `https://anxinshophub.com`

### 環境切換（`src/config.ts`）
- `IS_DEV_MODE = false` → 連正式站（上線前確認此值）
- `IS_DEV_MODE = true` → 連本機 `127.0.0.1:5001`（開發測試用）

---

## 環境變數（`backend/.env`，不進 Git）

```
DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
JWT_SECRET
R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME, R2_PUBLIC_URL
```

Firebase 私密金鑰放在 `backend/config/serviceAccountKey.json`（不進 Git）。

---

## 部署資訊

- 前端正式網址：`https://anxinshophub.com`（或 `www.anxinshophub.com`）
- 後端也部署在同一網域（`vercel.json` 在根目錄）
- 本地開發輔助工具：`backend/ngrok.exe`（讓手機測試能打到本機後端）
