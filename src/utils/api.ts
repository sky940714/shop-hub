import { API_BASE_URL } from '../config';

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('token');
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = { ...((options.headers as any) || {}) };
  
  // ✅ 智慧判斷：如果不是傳送檔案，才加上 JSON 宣告
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return await fetch(url, {
    ...options,
    headers: headers, 
  });
};