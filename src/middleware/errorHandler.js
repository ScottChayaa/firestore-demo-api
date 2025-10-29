/**
 * 統一錯誤處理中間件
 * 捕獲所有未處理的錯誤並回傳標準化的錯誤回應
 */
function errorHandler(err, req, res, next) {
  console.error('❌ Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
  });

  // 預設錯誤狀態碼
  const statusCode = err.statusCode || 500;

  // 標準化錯誤回應
  const errorResponse = {
    success: false,
    error: err.name || 'InternalServerError',
    message: err.message || '伺服器發生錯誤',
  };

  // 開發環境顯示詳細錯誤資訊
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack;
    errorResponse.details = err.details;
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 處理 404 Not Found
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: 'NotFound',
    message: `找不到路徑: ${req.method} ${req.path}`,
  });
}

/**
 * 非同步路由處理器的包裝函數
 * 自動捕獲 async/await 錯誤並傳遞給錯誤處理中間件
 *
 * 使用方式：
 * router.get('/users', asyncHandler(async (req, res) => {
 *   const users = await db.collection('users').get();
 *   res.json(users);
 * }));
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * 自訂錯誤類別
 */
class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
  }
}

class NotFoundError extends AppError {
  constructor(message = '找不到資源') {
    super(message, 404);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授權的請求') {
    super(message, 401);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '禁止存取') {
    super(message, 403);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};
