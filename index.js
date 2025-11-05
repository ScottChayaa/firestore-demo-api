/**
 * Firestore Demo API - 伺服器入口點
 *
 * Node.js + Express + Firestore 會員訂單查詢系統
 * 支援公開 API（商品瀏覽）和私有 API（會員、訂單管理）
 *
 * 作者：scottchayaa
 * 日期：2025-10-29
 */

require('dotenv').config();

// 驗證必要的環境變數
console.log('🔍 檢查環境變數...');

const requiredEnvVars = ['FIREBASE_PROJECT_ID'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  console.error('❌ 缺少必要的環境變數:', missingEnvVars.join(', '));
  console.error('請檢查 .env 檔案或環境變數設定');
  process.exit(1);
}

// 驗證 Firebase 憑證
if (!process.env.GOOGLE_CREDENTIALS_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  console.error('❌ 未找到 Firebase 憑證');
  console.error('請設定以下任一環境變數：');
  console.error('  - GOOGLE_CREDENTIALS_BASE64 (Base64 編碼的服務帳號 JSON)');
  console.error('  - GOOGLE_APPLICATION_CREDENTIALS (服務帳號 JSON 檔案路徑)');
  process.exit(1);
}

console.log('✅ 環境變數檢查通過');

const app = require('./src/app');

// 設定伺服器埠號
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 啟動伺服器
const server = app.listen(PORT, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Firestore Demo API Server Started');
  console.log('='.repeat(60));
  console.log(`📡 Environment: ${NODE_ENV}`);
  console.log(`🌍 Server URL: http://localhost:${PORT}`);
  console.log(`📋 Health Check: http://localhost:${PORT}/health`);
  console.log(`📦 Project ID: ${process.env.FIREBASE_PROJECT_ID || 'Not Set'}`);
  console.log('='.repeat(60));
  console.log('\n✅ Server is ready to accept connections\n');
});

// 優雅地關閉伺服器
const gracefulShutdown = (signal) => {
  console.log(`\n\n⚠️  收到 ${signal} 信號，正在關閉伺服器...`);

  server.close(() => {
    console.log('✅ HTTP 伺服器已關閉');
    console.log('👋 再見！\n');
    process.exit(0);
  });

  // 如果 10 秒內無法關閉，強制退出
  setTimeout(() => {
    console.error('❌ 無法優雅地關閉伺服器，強制退出');
    process.exit(1);
  }, 10000);
};

// 監聽終止信號
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // 可選：在生產環境中，可能需要記錄到日誌系統並重啟伺服器
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // 對於 uncaughtException，最好的做法是記錄錯誤後退出
  process.exit(1);
});

// 匯出 server 實例（用於測試）
module.exports = server;
