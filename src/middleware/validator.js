const { query, body, check, validationResult } = require("express-validator");
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
 * default() 功能在 query(), body() 的情況下才會有用
 * 
 * check() 會自動在 query / body / params / headers 中找
 */
class Validator {
  /**
   * 驗證查詢欄位: 分頁參數
   */
  queryPagination = () => {
    return [
      query("limit").default(20).isInt({ min: 1, max: 100 }).withMessage(`limit 範圍需 1~${MAX_LIMIT}`).toInt(),
      query("cursor").optional(),
    ];
  };
  
  /**
   * 驗證查詢欄位: 建立日期範圍 (會自動轉 ISO8601 Date 物件 )
   */
  queryCreatedAtRange = () => {
    return [
      query("minCreatedAt").optional().isISO8601().withMessage(`minCreatedAt 格式不正確（應為 ISO 8601 格式）`).toDate(),
      query("maxCreatedAt")
        .optional()
        .isISO8601()
        .withMessage(`maxCreatedAt 格式不正確（應為 ISO 8601 格式）`)
        .toDate()
        .custom((maxCreatedAt, { req }) => {
          if (maxCreatedAt < req.query.minCreatedAt) {
            throw new Error("maxCreatedAt 必須大於 minCreatedAt");
          }

          return true;
        }),
    ];
  };

  /**
   * 驗證查詢欄位: 排序參數
   * @param {*} extraOrderColumns 額外的排序欄位
   * @returns 
   */
  queryOrderBy = (extraOrderColumns = []) => {
    extraOrderColumns = ["createdAt", ...extraOrderColumns.filter(orderColumn => orderColumn !== "createdAt")]; // 不管傳進來的陣列是什麼，都要保證回傳結果一定包含 "createdAt"，而且不要重複

    return [
      query("order").default("desc").isIn(["desc", "asc"]),
      query("orderBy").default("createdAt").isIn(extraOrderColumns),
    ];
  };

  /**
   * 驗證查詢欄位: 軟刪除
   */
  queryIncludeDeleted = () => query("includeDeleted").default("false").isIn(["true", "false"]);

  /**
   * 驗證查詢欄位: 啟用
   */
  queryIsActive = () => query("isActive").default("all").isIn(["all", "true", "false"]);

}

var validator = new Validator();

module.exports = {
  validate,
  validator,
};
