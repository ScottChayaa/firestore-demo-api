const express = require('express');
const { body, query } = require("express-validator");

const router = express.Router();
const orderController = require('@/controllers/orderController');
const { authMember } = require('@/middleware/authMember');
const { memberOwnership } = require('@/middleware/memberOwnership');
const { validate, validatePagination, validateDateRange } = require('@/middleware/validator');

const statusValidator = () => query("status")
    .default("pending")
    .isIn(["pending", "processing", "completed", "cancelled"]).withMessage("status 必須是 pending, processing, completed 或 cancelled");

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
  [
    query("order").default("desc").isIn(["desc", "asc"]),
    query("orderBy").default("createdAt").isIn(["createdAt", "totalAmount"]),
    query("minAmount").optional().isNumeric(),
    query("maxAmount").optional().isNumeric(),
    statusValidator(),
    validate,
  ],
  orderController.getOrders
);

module.exports = router;
