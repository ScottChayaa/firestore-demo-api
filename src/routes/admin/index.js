const express = require('express');
const router = express.Router();
const membersRoutes = require('./members');
const adminsRoutes = require('./admins');
const ordersRoutes = require('./orders');

/**
 * 管理員路由統一匯出
 * 基礎路徑：/api/admin
 */

// 掛載會員管理路由
router.use('/members', membersRoutes);

// 掛載管理員管理路由
router.use('/admins', adminsRoutes);

// 掛載訂單路由
router.use('/orders', ordersRoutes);

module.exports = router;
