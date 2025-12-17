const { check } = require('express-validator');

/**
 * 驗證器: 訂單
 */
class OrderValidator {
  /**
   * 驗證: 訂單狀態
   */
  status = () => check("status")
    .default("pending")
    .isIn(["pending", "processing", "completed", "cancelled"])
    .withMessage("status 必須是 pending, processing, completed 或 cancelled");
  
  /**
   * 驗證: 訂單金額範圍
   */
  amountRange = () => {
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
   * 驗證: 訂單金額欄位
   */
  totalAmount = () => check("totalAmount").isInt().withMessage('totalAmount 必須是數字').toInt();

  /**
   * 驗證: 訂單明細
   */
  items = () => check("items").isArray({ min: 1 }).withMessage('items 必須是非空陣列');
  
  /**
   * 驗證: 會員ID
   */
  memberId = () => check("memberId").notEmpty().withMessage('memberId 為必填欄位');
}

var orderValidator = new OrderValidator();


module.exports = {
  orderValidator
};
