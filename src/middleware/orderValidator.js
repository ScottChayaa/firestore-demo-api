const { query, body, check } = require("express-validator");

/**
 * 驗證器: 訂單
 */
class OrderValidator {
  /**
   * 驗證查詢欄位: 訂單狀態
   */
  queryStatus = () => query("status")
    .default("pending")
    .isIn(["pending", "processing", "completed", "cancelled"])
    .withMessage("status 必須是 pending, processing, completed 或 cancelled");
  
  /**
   * 驗證查詢欄位: 訂單金額範圍
   */
  queryTotalAmountRange = () => {
    return [
      check("minAmount").optional().isInt().toInt(),
      check("maxAmount")
        .optional()
        .isInt()
        .toInt()
        .custom((maxAmount, { req }) => {
          if (maxAmount < req.query.minAmount) {
            throw new Error("maxAmount 必須大於 minAmount");
          }

          return true;
        }),
    ];
  };

  /**
   * 驗證查詢欄位: 會員ID
   */
  queryMemberId = () => query("memberId").optional();

  /**
   * 驗證更新欄位: 會員ID
   */
  bodyMemberId = () => body("memberId").notEmpty().withMessage('memberId 為必填欄位');
  
  /**
   * 驗證更新欄位: 訂單明細
   */
  bodyItems = () => body("items").isArray({ min: 1 }).withMessage('items 必須是非空陣列');

  /**
   * 驗證更新欄位: 訂單金額
   */
  bodyTotalAmount = () => body("totalAmount").isInt().withMessage('totalAmount 必須是數字').toInt();

  /**
   * 驗證更新欄位: 訂單狀態
   */
  bodyStatus = () => body("status")
    .default("pending")
    .isIn(["pending", "processing", "completed", "cancelled"])
    .withMessage("status 必須是 pending, processing, completed 或 cancelled");
  
}

var orderValidator = new OrderValidator();


module.exports = {
  orderValidator
};
