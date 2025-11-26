const express = require('express');
const router = express.Router();
const orderController = require('@/controllers/orderController');
const { authMember } = require('@/middleware/authMember');
const { memberOwnership } = require('@/middleware/memberOwnership');
const { validate, validatePagination, validateDateRange } = require('@/middleware/validator');
const { orderQueryValidators } = require('@/middleware/orderValidators');

/**
 * 會員訂單路由
 * 基礎路徑：/api/member/orders
 *
 * 所有端點都需要：
 * 1. authMember - 驗證會員身份
 * 2. memberOwnership - 強制只查詢自己的訂單
 */

// 取得會員自己的訂單列表
// GET /api/member/orders
router.get(
  '/',
  authMember,
  memberOwnership,
  validatePagination,
  validateDateRange,
  orderQueryValidators,
  validate,
  orderController.getOrders
);

module.exports = router;
