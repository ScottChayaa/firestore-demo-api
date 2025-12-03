/**
 * Jest 測試環境設定
 *
 * 功能：
 * 1. 在所有測試檔案執行前預先載入 Firebase Admin SDK
 * 2. 預先載入 Express app（觸發所有模組載入）
 * 3. 預熱 Firestore gRPC 連線（減少首次查詢延遲）
 *
 * 效果：
 * - 避免第一個測試檔案承擔 Firebase 初始化成本（1-2 秒）
 * - 避免第一個測試承擔 Firestore 首次連線成本（500-1600ms）
 * - 所有測試的執行時間更一致
 */

// 預先載入並初始化 Firebase Admin SDK
require('../../src/config/firebase');

// 預先載入 Express app（觸發所有模組載入）
require('../../src/app');

const { db } = require('../../src/config/firebase');

// 測試環境專用：預熱 Firestore gRPC 連線
// 使用 listCollections() 建立連線（輕量級，僅 1 次讀取操作）
(async () => {
  try {
    await db.listCollections();
    console.log('✅ Test environment: Firebase Admin SDK and Firestore warmed up');
  } catch (error) {
    console.warn('⚠️  Firestore warmup failed (tests will continue):', error.message);
  }
})();
