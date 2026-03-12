import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anxin.shophub',
  appName: '安鑫購物',
  webDir: 'build',
  // 🔽 加入這段：允許 App 在本地測試時使用 http 連線 (明文傳輸)
  server: {
    cleartext: true
  }
};

export default config;