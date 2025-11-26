const express = require('express');
const router = express.Router();
const orderController = require('@/controllers/orderController');
const { authAdmin } = require('@/middleware/authAdmin');
const { validate, validatePagination, validateDateRange } = require('@/middleware/validator');
const { orderQueryValidators, createOrderValidators } = require('@/middleware/orderValidators');

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
  orderQueryValidators,
  validate,
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
  createOrderValidators,
  validate,
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
