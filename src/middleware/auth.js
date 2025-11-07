const logger = require('../config/logger');
const { auth } = require('../config/firebase');
const { checkAdminStatus } = require('./adminCheck');

/**
 * Firebase Auth 驗證中間件
 * 驗證請求的 Authorization Header 中的 Firebase ID Token
 * 自動檢查並附加管理員狀態
 *
 * 使用方式：
 * router.get('/protected', authenticate, (req, res) => {
 *   // req.user 包含已驗證的用戶資訊
 *   // req.user.isAdmin 表示是否為管理員
 * });
 */
async function authenticate(req, res, next) {
  try {
    // 取得 Authorization Header
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        error: 'Missing Authorization header',
        message: '請提供 Authorization header: Bearer <token>',
      });
    }

    // 檢查格式：Bearer <token>
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        error: 'Invalid Authorization header format',
        message: '格式應為: Bearer <token>',
      });
    }

    const idToken = parts[1];

    // 驗證 Firebase ID Token
    const decodedToken = await auth.verifyIdToken(idToken);

    // 將用戶資訊附加到 request 物件
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      name: decodedToken.name,
      picture: decodedToken.picture,
    };

    // 檢查管理員狀態並繼續
    await checkAdminStatus(req, res, next);
  } catch (error) {
    logger.error({ err: error }, 'Authentication error');

    // 處理不同類型的錯誤
    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'ID Token 已過期，請重新登入',
      });
    }

    if (error.code === 'auth/argument-error') {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'ID Token 格式不正確',
      });
    }

    // 其他驗證錯誤
    return res.status(401).json({
      error: 'Authentication failed',
      message: '身份驗證失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 可選的驗證中間件
 * 如果提供了 token 則驗證，否則繼續（req.user 會是 null）
 * 適用於可選登入的端點
 */
async function optionalAuthenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  // 沒有提供 token，直接通過
  if (!authHeader) {
    req.user = null;
    return next();
  }

  // 有提供 token，使用正常的驗證流程
  return authenticate(req, res, next);
}

module.exports = {
  authenticate,
  optionalAuthenticate,
};
