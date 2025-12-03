/**
 * Firestore Demo API - 伺服器入口點
 *
 * Node.js + Express + Firestore 會員訂單查詢系統
 */
require('module-alias/register');
require('dotenv').config();

const logger = require('@/config/logger');

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
const { db } = require('@/config/firebase');

// 設定伺服器埠號
const PORT = process.env.PORT || 8080;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Firestore 連線預熱
 *
 * 用途：
 * - 在應用啟動時建立 Firestore gRPC 連線池
 * - 減少首次查詢的延遲（500-1600ms → 0ms）
 *
 * 重要：
 * - gRPC 連線是 Database 層級，不是 Collection 層級
 * - 使用 listCollections() 建立連線（僅 1 次讀取操作）
 * - 後續所有 collections 的查詢會自動複用此連線
 * - 無法消除 Cloud Run 容器冷啟動（1-3 秒）
 * - 僅在 ENABLE_FIRESTORE_WARMUP=true 時執行
 *
 * 技術細節：
 * - listCollections() 成本：1 read（無論多少 collections）
 * - 替代方案：limit(0).get() 0 reads, limit(1).get() 1 read + 資料
 * - 選用 listCollections() 平衡成本與可靠性
 */
async function warmupFirestore() {
  // 檢查是否啟用
  const enabled = process.env.ENABLE_FIRESTORE_WARMUP === 'true';
  if (!enabled) {
    logger.info('⏭️  Firestore warmup disabled (ENABLE_FIRESTORE_WARMUP=false)');
    return;
  }

  logger.info('🔥 Starting Firestore warmup...');

  const startTime = Date.now();

  try {
    // 使用 listCollections() 建立 gRPC 連線（最輕量級方法）
    // 此操作會觸發 gRPC Channel Pool 初始化
    // 成本：1 次讀取操作（無論資料庫有多少 collections）
    //
    // 替代方案比較：
    // - listCollections(): 1 read, 可靠建立連線
    // - limit(0).get(): 0 reads, 但可能不建立完整連線
    // - limit(1).get(): 1 read + 返回資料, 驗證連線但略重
    await db.listCollections();

    const duration = Date.now() - startTime;

    logger.info({
      duration: `${duration}ms`,
      method: 'listCollections()',
      note: 'All collections will reuse this connection'
    }, '✅ Firestore warmup completed');
  } catch (error) {
    logger.warn({
      err: error,
      note: 'Server will continue, but first query may be slower'
    }, '⚠️  Firestore warmup failed (non-blocking)');
  }
}

// 啟動伺服器
const server = app.listen(PORT, async () => {
  logger.info({
    environment: NODE_ENV,
    port: PORT,
    projectId: process.env.FIREBASE_PROJECT_ID,
    urls: {
      server: `http://localhost:${PORT}`,
      health: `http://localhost:${PORT}/health`
    }
  }, '🚀 Firestore Demo API 伺服器開啟');

  // 執行 Firestore 預熱（非阻塞）
  try {
    await warmupFirestore();
  } catch (error) {
    // 預熱失敗不應該阻止服務啟動
    logger.error({ err: error }, '❌ Warmup error (server continues)');
  }

  logger.info('🎉 Application ready to accept requests');
});

// 優雅地關閉伺服器
const gracefulShutdown = (signal) => {
  logger.warn({ signal }, '❗ 收到終止信號，正在關閉伺服器...');

  server.close(() => {
    logger.info('✅ HTTP 伺服器已關閉');
    process.exit(0);
  });

  // 如果 10 秒內無法關閉，強制退出
  setTimeout(() => {
    logger.error('❗ 無法優雅地關閉伺服器，強制退出');
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
