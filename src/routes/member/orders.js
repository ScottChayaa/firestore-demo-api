const express = require('express');
const router = express.Router();
const orderController = require('@/controllers/orderController');
const { validate, validator } = require('@/middleware/validator');
const { orderValidator } = require('@/middleware/orderValidator');

/**
 * 會員訂單路由
 * 基礎路徑：/api/member/orders
 */

// 取得會員自己的訂單列表
router.get(
  '/',
  validator.queryPagination(),
  validator.queryCreatedAtRange(),
  orderValidator.queryStatus(),
  orderValidator.queryTotalAmountRange(),
  orderValidator.queryMemberId(),
  validate, 
  orderController.getOrders
);

module.exports = router;
