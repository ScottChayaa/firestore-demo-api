const { db } = require('../config/firebase');
const { ForbiddenError, NotFoundError } = require('./errorHandler');

/**
 * 訂單權限過濾 middleware
 * 確保會員只能存取自己的訂單，管理員可以存取所有訂單
 *
 * 使用於 GET /api/orders（列表查詢）
 * - 非管理員：強制 query.memberId = req.user.uid
 * - 管理員：允許查詢所有訂單或指定 memberId
 */
function filterOrdersByOwnership(req, res, next) {
  try {
    // 管理員不限制
    if (req.user && req.user.isAdmin) {
      return next();
    }

    // 一般會員：強制只能查詢自己的訂單
    if (req.user && req.user.uid) {
      // 強制設定 memberId 為當前用戶的 UID
      req.query.memberId = req.user.uid;
      return next();
    }

    // 沒有用戶資訊（不應該發生，因為有 authenticate middleware）
    return res.status(401).json({
      error: 'Unauthorized',
      message: '需要登入才能查詢訂單',
    });
  } catch (error) {
    console.error('❌ Error in filterOrdersByOwnership:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: '權限檢查失敗',
    });
  }
}

/**
 * 檢查訂單所有權 middleware
 * 確保會員只能存取自己的訂單，管理員可以存取所有訂單
 *
 * 使用於 GET /api/orders/:id, PUT /api/orders/:id, DELETE /api/orders/:id
 */
async function checkOrderOwnership(req, res, next) {
  try {
    // 管理員不限制
    if (req.user && req.user.isAdmin) {
      return next();
    }

    // 取得訂單 ID
    const orderId = req.params.id;

    // 查詢訂單
    const orderDoc = await db.collection('orders').doc(orderId).get();

    if (!orderDoc.exists) {
      throw new NotFoundError(`找不到訂單 ID: ${orderId}`);
    }

    const orderData = orderDoc.data();

    // 檢查訂單是否屬於當前用戶
    if (orderData.memberId !== req.user.uid) {
      throw new ForbiddenError('您沒有權限存取此訂單');
    }

    // 通過檢查
    next();
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        error: 'NotFound',
        message: error.message,
      });
    }

    if (error instanceof ForbiddenError) {
      return res.status(403).json({
        error: 'Forbidden',
        message: error.message,
      });
    }

    console.error('❌ Error in checkOrderOwnership:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: '權限檢查失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 強制創建訂單時 memberId 為當前用戶
 * 防止用戶為其他人建立訂單
 *
 * 使用於 POST /api/orders
 */
function enforceOwnershipOnCreate(req, res, next) {
  try {
    // 管理員不限制
    if (req.user && req.user.isAdmin) {
      return next();
    }

    // 一般會員：強制 memberId 為當前用戶
    if (req.user && req.user.uid) {
      req.body.memberId = req.user.uid;
      return next();
    }

    // 沒有用戶資訊（不應該發生）
    return res.status(401).json({
      error: 'Unauthorized',
      message: '需要登入才能建立訂單',
    });
  } catch (error) {
    console.error('❌ Error in enforceOwnershipOnCreate:', error);
    return res.status(500).json({
      error: 'InternalServerError',
      message: '權限檢查失敗',
    });
  }
}

module.exports = {
  filterOrdersByOwnership,
  checkOrderOwnership,
  enforceOwnershipOnCreate,
};
