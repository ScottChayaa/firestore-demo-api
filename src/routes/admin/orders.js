const express = require('express');
const router = express.Router();
const orderController = require('@/controllers/orderController');
const { authAdmin } = require('@/middleware/authAdmin');
const { validatePagination, validateDateRange } = require('@/middleware/validator');
const { body } = require('express-validator');
const { validate } = require('@/middleware/validator');

const statusValidator = () => query("status")
    .notEmpty().withMessage("status 不可為空")
    .isIn(["pending", "processing", "completed", "cancelled"]).withMessage("status 必須是 pending, processing, completed 或 cancelled");

/**
 * 管理員訂單路由
 * 基礎路徑：/api/admin/orders
 *
 * 所有端點都需要：
 * - authAdmin - 驗證管理員身份
 */

// 取得所有訂單列表（支援多條件篩選）
// GET /api/admin/orders?memberId=xxx&status=completed&startDate=2025-01-01
router.get(
  '/',
  authAdmin,
  validatePagination,
  validateDateRange,
  [
    query("order").default("desc").isIn(["desc", "asc"]),
    query("orderBy").default("createdAt").isIn(["createdAt", "totalAmount"]),
    query("minAmount").isNumeric(),
    query("maxAmount").isNumeric(),
    statusValidator(),
    validate,
  ],
  orderController.getOrders
);

// 取得單一訂單
// GET /api/admin/orders/:id
router.get(
  '/:id',
  authAdmin,
  orderController.getOrderById
);

// 建立訂單
// POST /api/admin/orders
router.post(
  '/',
  authAdmin,
  [
    body('memberId').notEmpty().withMessage('memberId 為必填欄位'),
    body('items').isArray({ min: 1 }).withMessage('items 必須是非空陣列'),
    body('totalAmount').isNumeric().withMessage('totalAmount 必須是數字'),
    validate,
  ],
  orderController.createOrder
);

// 更新訂單
// PUT /api/admin/orders/:id
router.put(
  '/:id',
  authAdmin,
  orderController.updateOrder
);

// 刪除訂單
// DELETE /api/admin/orders/:id
router.delete(
  '/:id',
  authAdmin,
  orderController.deleteOrder
);

module.exports = router;
