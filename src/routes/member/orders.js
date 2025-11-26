const express = require("express");
const router = express.Router();
const orderController = require("@/controllers/orderController");
const { validate, validatePagination, validateDateRange } = require("@/middleware/validator");
const { orderQueryValidators } = require("@/middleware/orderValidators");

/**
 * 會員訂單路由
 * 基礎路徑：/api/member/orders
 */

// 取得會員自己的訂單列表
// GET /api/member/orders
router.get("/", validatePagination, validateDateRange, orderQueryValidators, validate, orderController.getOrders);

module.exports = router;
