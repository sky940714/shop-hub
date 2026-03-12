// src/utils/api.ts
import { API_BASE_URL } from '../config';

/**
 * 統一的 API 請求工具
 * 自動處理：基礎網址、Token 注入、Content-Type 設定
 */
export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  
  // 1. 自動判斷並補全網址
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  // 2. 設定預設 Headers
  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  // 3. 如果有 Token 則自動注入
  if (token) {
    defaultHeaders['Authorization'] = `Bearer ${token}`;
  }

  // ⚠️ 這裡必須呼叫瀏覽器原生 fetch，不可呼叫 apiFetch 以免造成死循環
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });

  return response;
};