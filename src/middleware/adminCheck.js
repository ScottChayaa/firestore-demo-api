const logger = require('../config/logger');
const { db } = require('../config/firebase');
const { ForbiddenError } = require('./errorHandler');

/**
 * 檢查用戶是否為管理員
 * 查詢 Firestore admins collection
 *
 * 注意：這個 middleware 必須在 authenticate 之後使用
 * 因為它需要 req.user.uid
 */
async function checkAdminStatus(req, res, next) {
  try {
    if (!req.user || !req.user.uid) {
      req.user.isAdmin = false;
      return next();
    }

    // 查詢 admins collection
    const adminDoc = await db.collection('admins').doc(req.user.uid).get();

    // 附加管理員狀態到 req.user
    req.user.isAdmin = adminDoc.exists;

    next();
  } catch (error) {
    console.error('❌ Error checking admin status:', error); // TODO: 待處理
    // 即使檢查失敗，也繼續處理（預設為非管理員）
    req.user.isAdmin = false;
    next();
  }
}

/**
 * 要求管理員權限的 middleware
 * 如果用戶不是管理員，返回 403 Forbidden
 *
 * 使用方式：
 * router.get('/admin-only', authenticate, requireAdmin, handler);
 */
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    throw new ForbiddenError('需要管理員權限才能存取此資源');
  }

  next();
}

module.exports = {
  checkAdminStatus,
  requireAdmin,
};
