const express = require('express');
const { body, query } = require('express-validator');

const router = express.Router();
const memberController = require('@/controllers/memberController');
const adminController = require('@/controllers/adminController');
const { validatePagination, validateDateRange } = require('@/middleware/validator');
const { validate } = require('@/middleware/validator');

/**
 * 管理員會員管理路由
 * 基礎路徑：/api/admin/members
 */

// 取得所有會員列表（支援多條件篩選）
// GET /api/admin/members?startDate=2025-01-01
router.get(
  '/',
  validatePagination,
  validateDateRange,
  [
    query("order").default("desc").isIn(["desc", "asc"]),
    query("orderBy").default("createdAt").isIn(["createdAt"]),
    validate,
  ],
  memberController.getMembers
);

// 建立會員（同時建立 Auth 帳號）
// POST /api/admin/members
router.post(
  '/',
  [
    body('email').isEmail().withMessage('email 格式不正確'),
    body('password').isLength({ min: 6 }).withMessage('password 至少需要 6 個字元'),
    body('name').notEmpty().withMessage('name 為必填欄位'),
    validate,
  ],
  memberController.createMember
);

// 為現有帳號賦予會員角色
// POST /api/admin/members/create-role
router.post(
  '/create-role',
  [
    body('uid').notEmpty().withMessage('uid 為必填欄位'),
    body('name').notEmpty().withMessage('name 為必填欄位'),
    validate,
  ],
  adminController.createMemberRole
);

// 取得單一會員
// GET /api/admin/members/:id
router.get(
  '/:id',
  memberController.getMemberById
);

// 更新會員
// PUT /api/admin/members/:id
router.put(
  '/:id',
  memberController.updateMember
);

// 刪除會員（軟刪除）
// DELETE /api/admin/members/:id
router.delete(
  '/:id',
  memberController.deleteMember
);

// 切換會員啟用/停用狀態
// PATCH /api/admin/members/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  memberController.toggleMemberStatus
);

// 恢復已軟刪除的會員
// POST /api/admin/members/:id/restore
router.post(
  '/:id/restore',
  memberController.restoreMember
);

module.exports = router;
