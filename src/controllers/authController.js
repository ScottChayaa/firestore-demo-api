const { auth, db, FieldValue } = require('../config/firebase');
const { ValidationError } = require('../middleware/errorHandler');
const axios = require('axios');

/**
 * 會員註冊
 * 同時建立 Firebase Auth 用戶和 Firestore member document
 *
 * Body 參數：
 * - email: Email（必填）
 * - password: 密碼（必填，至少 6 字元）
 * - name: 姓名（必填）
 * - phone: 電話（必填）
 */
async function register(req, res) {
  try {
    const { email, password, name, phone } = req.body;

    // 檢查 Email 是否已存在於 Firestore
    const existingMember = await db.collection('members')
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingMember.empty) {
      throw new ValidationError('此 Email 已被使用');
    }

    // 1. 在 Firebase Auth 建立用戶
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    // 2. 在 Firestore 建立 member document（使用 Firebase Auth 的 UID）
    const memberData = {
      name,
      email,
      phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('members').doc(userRecord.uid).set(memberData);

    res.status(201).json({
      message: '註冊成功，請使用 /api/auth/login 登入取得 token',
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name,
        phone,
      }
    });
  } catch (error) {
    // Firebase Auth 錯誤處理
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({
        error: 'ValidationError',
        message: '此 Email 已在 Firebase Auth 中註冊',
      });
    }

    if (error.code === 'auth/invalid-email') {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'Email 格式不正確',
      });
    }

    if (error.code === 'auth/weak-password') {
      return res.status(400).json({
        error: 'ValidationError',
        message: '密碼強度不足（至少 6 個字元）',
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error registering user:', error);
    res.status(500).json({
      error: 'InternalServerError',
      message: '註冊失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 會員登入
 * 使用 Firebase REST API 驗證密碼並取得 ID Token
 *
 * Body 參數：
 * - email: Email（必填）
 * - password: 密碼（必填）
 *
 * 回傳：
 * - idToken: Firebase ID Token（用於後續 API 請求）
 * - refreshToken: Refresh Token（用於更新 token）
 * - expiresIn: Token 有效期限（秒）
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    // 驗證必填欄位
    if (!email || !password) {
      throw new ValidationError('email 和 password 為必填欄位');
    }

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      console.error('❌ FIREBASE_WEB_API_KEY 未設定');
      return res.status(500).json({
        error: 'ConfigurationError',
        message: '伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY',
      });
    }

    // 使用 Firebase REST API 驗證密碼
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
      {
        email,
        password,
        returnSecureToken: true,
      }
    );

    const { idToken, refreshToken, expiresIn, localId } = response.data;

    // 取得 Firestore 中的會員資料
    const memberDoc = await db.collection('members').doc(localId).get();

    if (!memberDoc.exists) {
      return res.status(404).json({
        error: 'NotFound',
        message: '找不到對應的會員資料',
      });
    }

    const memberData = memberDoc.data();

    res.json({
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid: localId,
          email: memberData.email,
          name: memberData.name,
          phone: memberData.phone,
        },
      },
      message: '登入成功',
    });
  } catch (error) {
    // Firebase REST API 錯誤處理
    if (error.response && error.response.data) {
      const errorCode = error.response.data.error.message;

      if (errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'INVALID_PASSWORD') {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Email 或密碼錯誤',
        });
      }

      if (errorCode === 'USER_DISABLED') {
        return res.status(403).json({
          error: 'Forbidden',
          message: '此帳號已被停用',
        });
      }

      if (errorCode === 'TOO_MANY_ATTEMPTS_TRY_LATER') {
        return res.status(429).json({
          error: 'TooManyRequests',
          message: '登入嘗試次數過多，請稍後再試',
        });
      }
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error logging in:', error.response?.data || error.message);
    res.status(500).json({
      error: 'InternalServerError',
      message: '登入失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  register,
  login,
};
