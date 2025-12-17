const { check, validationResult } = require("express-validator");
const { ValidationError } = require("@/middleware/errorHandler");

const DEFAULT_LIMIT = parseInt(process.env.DEFAULT_PAGE_LIMIT) || 20;
const MAX_LIMIT = parseInt(process.env.MAX_PAGE_LIMIT) || 100;

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
 * 驗證器 (共用)
 * 
 * check() 會自動在 query / body / params / headers 中找
 */
class Validator {
  /**
   * 驗證: 分頁參數
   */
  pagination = () => {
    return [
      check("limit").default(DEFAULT_LIMIT).isInt({ min: 1, max: MAX_LIMIT }).withMessage(`limit 範圍需 1~${MAX_LIMIT}`).toInt(),
      check("cursor").optional(),
    ];
  };
  
  /**
   * 驗證: 日期範圍參數 (會自動轉 ISO8601 Date 物件 )
   */
  dateRange = () => {
    return [
      check("startDate").optional().isISO8601().withMessage(`startDate 格式不正確（應為 ISO 8601 格式）`).toDate(),
      check("endDate")
        .optional()
        .isISO8601()
        .withMessage(`endDate 格式不正確（應為 ISO 8601 格式）`)
        .toDate()
        .custom((endDate, { req }) => {
          if (endDate < req.query.startDate) {
            throw new Error("endDate 必須大於 startDate");
          }

          return true;
        }),
    ];
  };

  /**
   * 驗證: 排序參數
   * @param {*} orderColumns 排序欄位
   * @returns 
   */
  orderBy = (orderColumns = []) => {
    orderColumns = ["createdAt", ...orderColumns.filter(orderColumn => orderColumn !== "createdAt")]; // 不管傳進來的陣列是什麼，都要保證回傳結果一定包含 "createdAt"，而且不要重複

    return [
      check("order").default("desc").isIn(["desc", "asc"]),
      check("orderBy").default("createdAt").isIn(orderColumns),
    ];
  };

  /**
   * 驗證: 軟刪除
   */
  includeDeleted = () => check("includeDeleted").default("false").isIn(["true", "false"]);

  /**
   * 驗證: 啟用
   */
  isActive = () => check("isActive").default("all").isIn(["all", "true", "false"]);
  
  /**
   * 驗證: Email
   */
  email = () => check("email").isEmail().withMessage('email 格式不正確');
  
  /**
   * 驗證: 密碼
   */
  password = () => check("password").isLength({ min: 6 }).withMessage('password 至少需要 6 個字元'),
}

var validator = new Validator();

module.exports = {
  validate,
  validator,
};
