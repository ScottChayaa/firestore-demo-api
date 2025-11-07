const { validationResult } = require('express-validator');

/**
 * 驗證中間件
 * 檢查 express-validator 的驗證結果
 * 如果有錯誤，回傳 400 和錯誤詳情
 *
 * 使用方式：
 * router.post('/users',
 *   body('email').isEmail(),
 *   body('name').notEmpty(),
 *   validate,
 *   createUser
 * );
 */
function validate(req, res, next) {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'ValidationError',
      message: '請求參數驗證失敗',
      details: errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  }

  next();
}

/**
 * 分頁參數驗證
 */
function validatePagination(req, res, next) {
  const { limit, cursor } = req.query;
  const DEFAULT_LIMIT = parseInt(process.env.DEFAULT_PAGE_LIMIT) || 20;
  const MAX_LIMIT = parseInt(process.env.MAX_PAGE_LIMIT) || 100;

  // 驗證 limit
  if (limit) {
    const parsedLimit = parseInt(limit);
    if (isNaN(parsedLimit) || parsedLimit < 1) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'limit 必須是大於 0 的整數',
      });
    }
    if (parsedLimit > MAX_LIMIT) {
      return res.status(400).json({
        error: 'ValidationError',
        message: `limit 不能超過 ${MAX_LIMIT}`,
      });
    }
    req.pagination = { limit: parsedLimit };
  } else {
    req.pagination = { limit: DEFAULT_LIMIT };
  }

  // cursor 可以是任意字串，不需特別驗證
  if (cursor) {
    req.pagination.cursor = cursor;
  }

  next();
}

/**
 * 日期範圍驗證
 */
function validateDateRange(req, res, next) {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'startDate 格式不正確（應為 ISO 8601 格式）',
      });
    }
    req.dateRange = { startDate: start };
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'endDate 格式不正確（應為 ISO 8601 格式）',
      });
    }
    req.dateRange = { ...req.dateRange, endDate: end };
  }

  // 檢查日期範圍是否合理
  if (req.dateRange && req.dateRange.startDate && req.dateRange.endDate) {
    if (req.dateRange.startDate > req.dateRange.endDate) {
      return res.status(400).json({
        error: 'ValidationError',
        message: 'startDate 不能晚於 endDate',
      });
    }
  }

  next();
}

module.exports = {
  validate,
  validatePagination,
  validateDateRange,
};
