// src/config.ts
import { Capacitor } from '@capacitor/core';

/**
 * 核心 API 基礎網址判斷
 * 1. 如果在手機 App (iOS/Android) 執行：連向正式站網址。
 * 2. 如果在本地電腦網頁開發 (development)：使用空字串，觸發 package.json 的 proxy 代理。
 * 3. 如果在線上正式網頁 (production)：連向正式站網址。
 */
export const API_BASE_URL = Capacitor.isNativePlatform()
  ? 'https://www.anxinshophub.com' 
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
   * 在手機 App 中，所有的圖片路徑必須是完整的 URL (包含 https://...)
   * 在網頁開發模式中，使用相對路徑即可
   */
  const domain = (Capacitor.isNativePlatform() || process.env.NODE_ENV === 'production')
    ? 'https://www.anxinshophub.com'
    : '';

  return `${domain}${cleanPath}`;
};