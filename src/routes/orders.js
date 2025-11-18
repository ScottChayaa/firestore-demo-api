const express = require("express");
const router = express.Router();
const { body, query } = require("express-validator");
const { getOrders, getOrderById, createOrder, updateOrder, deleteOrder } = require("../controllers/orderController");
const { validate, validatePagination, validateDateRange } = require("../middleware/validator");
const { filterOrdersByOwnership, checkOrderOwnership, enforceOwnershipOnCreate } = require("../middleware/ownership");


let status_isIn = ["pending", "processing", "completed", "cancelled"];
let status_withMessage = "status 必須是 pending, processing, completed 或 cancelled";

/**
 * 私有 API 路由 - 訂單管理
 * 所有端點都需要 Firebase Auth 驗證
 */

// 取得訂單列表（支援分頁和多條件篩選）
// GET /api/orders?memberId=xxx&status=completed&startDate=2025-01-01&limit=20&cursor=abc
// 會員只能查詢自己的訂單，管理員可查詢所有訂單
router.get(
  "/",
  filterOrdersByOwnership,
  validatePagination,
  validateDateRange,
  [
    query("order").default("desc").isIn(["desc", "asc"]),
    query("orderBy").default("createdAt").isIn(["createdAt", "totalAmount"]),
    query("status")
      .optional()
      .isIn(status_isIn)
      .withMessage(status_withMessage),
    validate,
  ],
  getOrders
);

// 創建訂單
// POST /api/orders
// 會員只能為自己建立訂單（memberId 會被強制設為當前用戶）
router.post(
  "/",
  enforceOwnershipOnCreate,
  [
    // memberId 會由 middleware 自動設定，所以改為 optional
    body("memberId").optional().notEmpty().withMessage("會員 ID 不可為空"),
    body("items").isArray({ min: 1 }).withMessage("items 必須是非空陣列"),
    body("totalAmount").isNumeric().withMessage("總金額必須是數字"),
    body("status")
      .optional()
      .isIn(status_isIn)
      .withMessage(status_withMessage),
    validate,
  ],
  createOrder
);

// 取得單一訂單
// GET /api/orders/:id
// 會員只能查詢自己的訂單，管理員可查詢所有訂單
router.get("/:id", checkOrderOwnership, getOrderById);

// 更新訂單
// PUT /api/orders/:id
// 會員只能更新自己的訂單，管理員可更新所有訂單
router.put(
  "/:id",
  checkOrderOwnership,
  [
    body("status")
      .optional()
      .isIn(status_isIn)
      .withMessage(status_withMessage),
    body("items").optional().isArray().withMessage("items 必須是陣列"),
    body("totalAmount").optional().isNumeric().withMessage("總金額必須是數字"),
    validate,
  ],
  updateOrder
);

// 刪除訂單
// DELETE /api/orders/:id
// 會員只能刪除自己的訂單，管理員可刪除所有訂單
router.delete("/:id", checkOrderOwnership, deleteOrder);

module.exports = router;
