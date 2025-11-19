const { validationResult } = require("express-validator");
const { ValidationError } = require("./errorHandler");

/**
 * 驗證中間件
 * 檢查 express-validator 的驗證結果
 * 如果有錯誤，回傳錯誤詳情
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
    let details = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    throw new ValidationError(details);
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
      throw new ValidationError({
        field: "limit",
        message: "必須是大於 0 的整數",
        value: limit,
      });
    }

    if (parsedLimit > MAX_LIMIT) {
      throw new ValidationError({
        field: "limit",
        message: `不能超過 ${MAX_LIMIT}`,
        value: limit,
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
      throw new ValidationError({
        field: "startDate",
        message: `格式不正確（應為 ISO 8601 格式）`,
        value: startDate,
      });
    }

    req.dateRange = { startDate: start };
  }

  if (endDate) {
    const end = new Date(endDate);

    if (isNaN(end.getTime())) {
      throw new ValidationError({
        field: "endDate",
        message: `格式不正確（應為 ISO 8601 格式）`,
        value: endDate,
      });
    }

    req.dateRange = { ...req.dateRange, endDate: end };
  }

  // 檢查日期範圍是否合理
  if (req.dateRange && req.dateRange.startDate && req.dateRange.endDate) {
    if (req.dateRange.startDate > req.dateRange.endDate) {
      throw new ValidationError({
        field: "startDate",
        message: `startDate 不能晚於 endDate`,
        value: startDate,
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
