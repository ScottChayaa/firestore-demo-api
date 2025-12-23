const express = require("express");
const router = express.Router();
const profileRoutes = require("./profile");
const ordersRoutes = require("./orders");
const { memberOwnership } = require("@/middleware/authMember");

/**
 * 會員路由統一匯出
 * 基礎路徑：/api/member
 */
router.use("/", profileRoutes); // 掛載個人資料路由
router.use("/orders", memberOwnership, ordersRoutes); // 掛載訂單路由

module.exports = router;
