// src/config.ts
import { Capacitor } from '@capacitor/core';

// ==========================================
// 開發環境設定區
// ==========================================
// 💡 要在模擬器或手機測試本機後端時，設為 true。準備打包上線時，改為 false。
const IS_DEV_MODE = true; 

// 📱 使用 Xcode 模擬器測試，直接填寫 localhost 即可
// (如果是實體手機才需要換成 Mac 的 Wi-Fi IP)
const DEV_LOCAL_IP = '127.0.0.1'; 

/**
 * 核心 API 基礎網址判斷
 * 1. 如果在手機 App/模擬器 執行：根據 IS_DEV_MODE 決定連向本機或正式站。
 * 2. 如果在本地電腦網頁開發 (development)：使用空字串，觸發 proxy 代理。
 * 3. 如果在線上正式網頁 (production)：連向正式站網址。
 */
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? (IS_DEV_MODE ? `http://${DEV_LOCAL_IP}:5001` : 'https://www.anxinshophub.com')
  : (process.env.NODE_ENV === 'development' ? '' : 'https://www.anxinshophub.com');

/**
 * 圖片路徑處理工具
 * 解決手機 App 無法讀取相對路徑圖片的問題
 */
export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return 'https://via.placeholder.com/400'; // 預設圖片
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }

  // 確保路徑開頭有 /
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  /**
   * 特別說明：
   * 圖片來源網域也必須跟著 API_BASE_URL 一起切換，否則圖片會顯示不出來
   */
  let domain = '';
  if (Capacitor.isNativePlatform()) {
    // 手機 App 模式
    domain = IS_DEV_MODE ? `http://${DEV_LOCAL_IP}:5001` : 'https://www.anxinshophub.com';
  } else if (process.env.NODE_ENV === 'production') {
    // 正式網頁模式
    domain = 'https://www.anxinshophub.com';
  }

  return `${domain}${cleanPath}`;
};