const admin = require('firebase-admin');
require('dotenv').config();

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
      console.log('✅ Firebase Admin SDK already initialized');
      return admin;
    }

    let credential;

    // 方式一：使用 Base64 編碼的 Service Account（Cloud Run 推薦）
    if (process.env.GOOGLE_CREDENTIALS_BASE64) {
      const serviceAccount = JSON.parse(
        Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
      );
      credential = admin.credential.cert(serviceAccount);
      console.log('✅ Using Base64 encoded credentials');
    }
    // 方式二：使用檔案路徑（本地開發）
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      credential = admin.credential.applicationDefault();
      console.log('✅ Using credentials from file:', process.env.GOOGLE_APPLICATION_CREDENTIALS);
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

    console.log('✅ Firebase Admin SDK initialized successfully');
    console.log('📦 Project ID:', process.env.FIREBASE_PROJECT_ID);

    return admin;
  } catch (error) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', error.message);
    throw error;
  }
}

// 初始化 Firebase
const firebaseAdmin = initializeFirebase();

// 匯出 Firestore 實例
const db = firebaseAdmin.firestore();

// 設定 Firestore 時區（可選）
db.settings({
  timestampsInSnapshots: true,
  ignoreUndefinedProperties: true,
});

module.exports = {
  admin: firebaseAdmin,
  db,
  auth: firebaseAdmin.auth(),
  FieldValue: admin.firestore.FieldValue,
  Timestamp: admin.firestore.Timestamp,
};
