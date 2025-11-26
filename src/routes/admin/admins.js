const express = require('express');
const { body, query } = require('express-validator');

const router = express.Router();
const adminController = require('@/controllers/adminController');
const { validatePagination, validateDateRange } = require('@/middleware/validator');
const { validate } = require('@/middleware/validator');

/**
 * 管理員管理路由
 * 基礎路徑：/api/admin/admins
 */

// 取得所有管理員列表（支援多條件篩選）
// GET /api/admin/admins?startDate=2025-01-01
router.get(
  '/',
  validatePagination,
  validateDateRange,
  adminController.getAdmins
);

// 建立管理員（同時建立 Auth 帳號）
// POST /api/admin/admins
router.post(
  '/',
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
  adminController.getAdminById
);

// 更新管理員
// PUT /api/admin/admins/:id
router.put(
  '/:id',
  adminController.updateAdmin
);

// 刪除管理員（軟刪除）
// DELETE /api/admin/admins/:id
router.delete(
  '/:id',
  adminController.deleteAdmin
);

// 切換管理員啟用/停用狀態
// PATCH /api/admin/admins/:id/toggle-status
router.patch(
  '/:id/toggle-status',
  adminController.toggleAdminStatus
);

// 恢復已軟刪除的管理員
// POST /api/admin/admins/:id/restore
router.post(
  '/:id/restore',
  adminController.restoreAdmin
);

module.exports = router;
