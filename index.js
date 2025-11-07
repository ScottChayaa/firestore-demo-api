/**
 * Firestore Demo API - 伺服器入口點
 *
 * Node.js + Express + Firestore 會員訂單查詢系統
 */

require('dotenv').config();
const logger = require('./src/config/logger');

// 驗證必要的環境變數
logger.info('檢查環境變數...');

const requiredEnvVars = ['FIREBASE_PROJECT_ID'];
const missingEnvVars = requiredEnvVars.filter(v => !process.env[v]);

if (missingEnvVars.length > 0) {
  logger.error({ missingEnvVars }, '缺少必要的環境變數');
  logger.error('請檢查 .env 檔案或環境變數設定');
  process.exit(1);
}

// 驗證 Firebase 憑證
if (!process.env.GOOGLE_CREDENTIALS_BASE64 && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  logger.error('未找到 Firebase 憑證');
  logger.error('請設定以下任一環境變數：');
  logger.error('  - GOOGLE_CREDENTIALS_BASE64 (Base64 編碼的服務帳號 JSON)');
  logger.error('  - GOOGLE_APPLICATION_CREDENTIALS (服務帳號 JSON 檔案路徑)');
  process.exit(1);
}

logger.info('環境變數檢查通過');

const app = require('./src/app');

// 設定伺服器埠號
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 啟動伺服器
const server = app.listen(PORT, () => {
  logger.info({
    environment: NODE_ENV,
    port: PORT,
    projectId: process.env.FIREBASE_PROJECT_ID,
    urls: {
      server: `http://localhost:${PORT}`,
      health: `http://localhost:${PORT}/health`
    }
  }, 'Firestore Demo API Server Started');
});

// 優雅地關閉伺服器
const gracefulShutdown = (signal) => {
  logger.warn({ signal }, '收到終止信號，正在關閉伺服器...');

  server.close(() => {
    logger.info('HTTP 伺服器已關閉');
    process.exit(0);
  });

  // 如果 10 秒內無法關閉，強制退出
  setTimeout(() => {
    logger.error('無法優雅地關閉伺服器，強制退出');
    process.exit(1);
  }, 10000);
};

// 監聽終止信號
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// 處理未捕獲的異常
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise: promise.toString() }, 'Unhandled Rejection');
  // 可選：在生產環境中，可能需要記錄到日誌系統並重啟伺服器
});

process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught Exception');
  // 對於 uncaughtException，最好的做法是記錄錯誤後退出
  process.exit(1);
});

// 匯出 server 實例（用於測試）
module.exports = server;
