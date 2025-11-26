const express = require('express');
const { body, query } = require('express-validator');

const router = express.Router();
const adminController = require('@/controllers/adminController');
const { authAdmin } = require('@/middleware/authAdmin');
const { validatePagination, validateDateRange } = require('@/middleware/validator');
const { validate } = require('@/middleware/validator');

/**
 * 管理員管理路由
 * 基礎路徑：/api/admin/admins
 *
 * 所有端點都需要：
 * - authAdmin - 驗證管理員身份
 */

// 取得所有管理員列表（支援多條件篩選）
// GET /api/admin/admins?startDate=2025-01-01
router.get(
  '/',
  authAdmin,
  validatePagination,
  validateDateRange,
  adminController.getAdmins
);

// 建立管理員（同時建立 Auth 帳號）
// POST /api/admin/admins
router.post(
  '/',
  authAdmin,
  [
    body('email').isEmail().withMessage('email 格式不正確'),
    body('password').isLength({ min: 6 }).withMessage('password 至少需要 6 個字元'),
    body('name').notEmpty().withMessage('name 為必填欄位'),
    validate,
  ],
  adminController.createAdmin
);

// 為現有帳號賦予管理員角色
// POST /api/admin/admins/create-role
router.post(
  '/create-role',
  authAdmin,
  [
    body('uid').notEmpty().withMessage('uid 為必填欄位'),
    body('name').notEmpty().withMessage('name 為必填欄位'),
    validate,
  ],
  adminController.createAdminRole
);

// 取得單一管理員
// GET /api/admin/admins/:id
router.get(
  '/:id',
  authAdmin,
  adminController.getAdminById
);

// 更新管理員
// PUT /api/admin/admins/:id
router.put(
  '/:id',
  authAdmin,
  adminController.updateAdmin
);

// 刪除管理員
// DELETE /api/admin/admins/:id
router.delete(
  '/:id',
  authAdmin,
  adminController.deleteAdmin
);

module.exports = router;
