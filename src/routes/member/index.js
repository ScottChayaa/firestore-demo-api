const express = require('express');
const router = express.Router();
const profileRoutes = require('./profile');
const ordersRoutes = require('./orders');

/**
 * 會員路由統一匯出
 * 基礎路徑：/api/member
 */

// 掛載個人資料路由
router.use('/', profileRoutes);

// 掛載訂單路由
router.use('/orders', ordersRoutes);

module.exports = router;
