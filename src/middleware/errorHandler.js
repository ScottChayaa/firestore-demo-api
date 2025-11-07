/**
 * 統一錯誤處理中間件
 * 捕獲所有未處理的錯誤並回傳標準化的錯誤回應
 *
 * 注意：不在此處記錄日誌，而是將錯誤資訊附加到 res.err
 * 讓 pino-http 在請求結束時統一記錄（避免重複日誌）
 */
function errorHandler(err, req, res, next) {
  // 將錯誤資訊附加到 res.err，供 pino-http 記錄
  res.err = err;

  // 預設錯誤狀態碼
  const statusCode = err.statusCode || 500;

  // 標準化錯誤回應
  const errorResponse = {
    error: err.name || 'InternalServerError',
    message: err.message || '伺服器發生錯誤',
  };

  if (err instanceof ValidationError) {
    errorResponse.details = err.details;
  }

  // 開發環境顯示詳細錯誤資訊
  if (process.env.NODE_ENV === 'development') {
    errorResponse.stack = err.stack?.split('\n') ?? [];
  }

  res.status(statusCode).json(errorResponse);
}

/**
 * 處理 404 Not Found
 */
function notFoundHandler(req, res) {
  res.status(404).json({
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
  constructor(statusCode = 500, message, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(details = [], message = '參數驗證失敗') {
    super(422, message, details);
  }
}

class BadError extends AppError {
  constructor(message = '請求無效') {
    super(400, message);
  }
}

class NotFoundError extends AppError {
  constructor(message = '找不到資源') {
    super(404, message);
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授權的請求') {
    super(401, message);
  }
}

class ForbiddenError extends AppError {
  constructor(message = '禁止存取') {
    super(403, message);
  }
}

class TooManyRequestsError extends AppError {
  constructor(message = '過多請求') {
    super(429, message);
  }
}

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  BadError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
};
