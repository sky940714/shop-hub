// capacitor.config.ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.anxin.shophub',
  appName: '安鑫購物',
  webDir: 'build',
  server: {
    // 🔽 【新增這段】：允許 App 跳轉到綠界的網域進行付款
    allowNavigation: [
      "*.ecpay.com.tw"
    ]
  }
};

export default config;