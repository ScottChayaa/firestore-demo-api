const admin = require('firebase-admin');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config();
const logger = require('./logger');

/**
 * 初始化 Firebase Admin SDK
 * 支援兩種方式：
 * 1. 使用 GOOGLE_APPLICATION_CREDENTIALS 指向 JSON 檔案
 * 2. 使用 GOOGLE_CREDENTIALS_BASE64 環境變數（適用於 Cloud Run）
 */
function initializeFirebase() {
  try {
    // 檢查是否已初始化
    if (admin.apps.length > 0) {
      logger.debug('Firebase Admin SDK already initialized');
      return admin;
    }

    let credential;

    // 方式一：使用 Base64 編碼的 Service Account（Cloud Run 推薦）
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
      );
      credential = admin.credential.cert(serviceAccount);
      logger.info('Using Base64 encoded credentials');
    }
    // 方式二：使用檔案路徑（本地開發）
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
      logger.info({ credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS }, 'Using credentials from file');
    }
    // 錯誤：未設定憑證
    else {
      throw new Error(
        'Missing Firebase credentials. Please set either:\n' +
        '  - GOOGLE_APPLICATION_CREDENTIALS (path to JSON file)\n' +
        '  - GOOGLE_CREDENTIALS_BASE64 (base64 encoded JSON)'
      );
    }

    // 初始化 Firebase Admin
    admin.initializeApp({
      credential: credential,
      projectId: process.env.FIREBASE_PROJECT_ID,
    });

    logger.info({ projectId: process.env.FIREBASE_PROJECT_ID }, 'Firebase Admin SDK initialized successfully');

    return admin;
  } catch (error) {
    logger.error({
      err: error,
      environment: {
        hasBase64Credentials: !!process.env.GOOGLE_CREDENTIALS_BASE64,
        base64Length: process.env.GOOGLE_CREDENTIALS_BASE64?.length,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.FIREBASE_PROJECT_ID
      }
    }, 'Failed to initialize Firebase Admin SDK');
    throw error;
  }
}

// 初始化 Firebase
const firebaseAdmin = initializeFirebase();

// 取得資料庫 ID（優先使用環境變數，否則使用預設值）
const databaseId = process.env.FIRESTORE_DATABASE_ID || '(default)';

// 匯出 Firestore 實例
// Firebase Admin SDK v12 使用 getFirestore() 函數
// 預設資料庫：getFirestore() 或 getFirestore('(default)')
// 命名資料庫：getFirestore('database-name')
const db = databaseId === '(default)'
  ? getFirestore()
  : getFirestore(databaseId);

// 設定 Firestore 時區（可選）
db.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true,
});

logger.info({ databaseId }, 'Firestore Database initialized');

module.exports = {
  admin: firebaseAdmin,
  db,
  auth: firebaseAdmin.auth(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};
