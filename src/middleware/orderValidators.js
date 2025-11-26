const { body, query } = require('express-validator');

/**
 * 訂單狀態驗證器
 */
const statusValidator = () => query("status")
  .default("pending")
  .isIn(["pending", "processing", "completed", "cancelled"])
  .withMessage("status 必須是 pending, processing, completed 或 cancelled");

/**
 * 訂單查詢參數驗證器（用於 GET 列表）
 */
const orderQueryValidators = [
  query("order").default("desc").isIn(["desc", "asc"]),
  query("orderBy").default("createdAt").isIn(["createdAt", "totalAmount"]),
  query("minAmount").optional().isNumeric(),
  query("maxAmount").optional().isNumeric(),
  statusValidator(),
];

/**
 * 創建訂單驗證器（用於 POST）
 */
const createOrderValidators = [
  body('memberId').notEmpty().withMessage('memberId 為必填欄位'),
  body('items').isArray({ min: 1 }).withMessage('items 必須是非空陣列'),
  body('totalAmount').isNumeric().withMessage('totalAmount 必須是數字'),
];

module.exports = {
  statusValidator,
  orderQueryValidators,
  createOrderValidators,
};
