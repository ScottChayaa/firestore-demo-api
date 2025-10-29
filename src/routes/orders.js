const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
} = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');
const {
  validate,
  validatePagination,
  validateDateRange,
} = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 私有 API 路由 - 訂單管理
 * 所有端點都需要 Firebase Auth 驗證
 */

// 套用驗證中間件到所有路由
router.use(authenticate);

// 取得訂單列表（支援分頁和多條件篩選）
// GET /api/orders?memberId=xxx&status=completed&startDate=2025-01-01&limit=20&cursor=abc
router.get(
  '/',
  validatePagination,
  validateDateRange,
  asyncHandler(getOrders)
);

// 創建訂單
// POST /api/orders
router.post(
  '/',
  [
    body('memberId').notEmpty().withMessage('會員 ID 為必填欄位'),
    body('items').isArray({ min: 1 }).withMessage('items 必須是非空陣列'),
    body('totalAmount').isNumeric().withMessage('總金額必須是數字'),
    body('status')
      .optional()
      .isIn(['pending', 'processing', 'completed', 'cancelled'])
      .withMessage('status 必須是 pending, processing, completed 或 cancelled'),
    validate,
  ],
  asyncHandler(createOrder)
);

// 取得單一訂單
// GET /api/orders/:id
router.get('/:id', asyncHandler(getOrderById));

// 更新訂單
// PUT /api/orders/:id
router.put(
  '/:id',
  [
    body('status')
      .optional()
      .isIn(['pending', 'processing', 'completed', 'cancelled'])
      .withMessage('status 必須是 pending, processing, completed 或 cancelled'),
    body('items')
      .optional()
      .isArray()
      .withMessage('items 必須是陣列'),
    body('totalAmount')
      .optional()
      .isNumeric()
      .withMessage('總金額必須是數字'),
    validate,
  ],
  asyncHandler(updateOrder)
);

// 刪除訂單
// DELETE /api/orders/:id
router.delete('/:id', asyncHandler(deleteOrder));

module.exports = router;
