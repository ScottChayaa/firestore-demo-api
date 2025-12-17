const express = require('express');
const router = express.Router();
const orderController = require('@/controllers/orderController');
const { validate, validator } = require('@/middleware/validator');
const { orderValidator } = require('@/middleware/orderValidator');

/**
 * 管理員訂單路由
 * 基礎路徑：/api/admin/orders
 */

// 取得所有訂單列表（支援多條件篩選）
// GET /api/admin/orders?memberId=xxx&status=completed&startDate=2025-01-01
router.get(
  '/',
  validator.pagination(),
  validator.dateRange(),
  orderValidator.status(),
  orderValidator.amountRange(),
  orderValidator.memberId(),
  validate,
  orderController.getOrders
);

// 取得單一訂單
// GET /api/admin/orders/:id
router.get(
  '/:id',
  orderController.getOrderById
);

// 建立訂單
// POST /api/admin/orders
router.post(
  '/',
  orderValidator.status(),
  orderValidator.totalAmount(),
  orderValidator.items(),
  orderValidator.memberId(),
  validate,
  orderController.createOrder
);

// 更新訂單
// PUT /api/admin/orders/:id
router.put(
  '/:id',
  orderController.updateOrder
);

// 刪除訂單
// DELETE /api/admin/orders/:id
router.delete(
  '/:id',
  orderController.deleteOrder
);

module.exports = router;
