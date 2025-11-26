const express = require('express');
const { body, query } = require('express-validator');

const router = express.Router();
const memberController = require('@/controllers/memberController');
const adminController = require('@/controllers/adminController');
const { authAdmin } = require('@/middleware/authAdmin');
const { validatePagination, validateDateRange } = require('@/middleware/validator');
const { validate } = require('@/middleware/validator');

/**
 * 管理員會員管理路由
 * 基礎路徑：/api/admin/members
 *
 * 所有端點都需要：
 * - authAdmin - 驗證管理員身份
 */

// 取得所有會員列表（支援多條件篩選）
// GET /api/admin/members?startDate=2025-01-01
router.get(
  '/',
  authAdmin,
  validatePagination,
  validateDateRange,
  memberController.getMembers
);

// 建立會員（同時建立 Auth 帳號）
// POST /api/admin/members
router.post(
  '/',
  authAdmin,
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
  authAdmin,
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
  authAdmin,
  memberController.getMemberById
);

// 更新會員
// PUT /api/admin/members/:id
router.put(
  '/:id',
  authAdmin,
  memberController.updateMember
);

// 刪除會員
// DELETE /api/admin/members/:id
router.delete(
  '/:id',
  authAdmin,
  memberController.deleteMember
);

module.exports = router;
