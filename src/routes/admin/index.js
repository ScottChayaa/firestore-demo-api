const express = require('express');
const router = express.Router();
const ordersRoutes = require('./orders');

/**
 * 管理員路由統一匯出
 * 基礎路徑：/api/admin
 */

// 掛載訂單路由
router.use('/orders', ordersRoutes);

module.exports = router;
