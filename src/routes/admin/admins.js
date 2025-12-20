const express = require('express');
const router = express.Router();
const adminController = require('@/controllers/adminController');
const { validate, validator } = require('@/middleware/validator');
const { adminValidator } = require('@/middleware/adminValidator');

/**
 * 管理員管理路由
 * 基礎路徑：/api/admin/admins
 */

// 取得所有管理員列表（支援多條件篩選）
// GET /api/admin/admins?minCreatedAt=2025-01-01
router.get(
  '/',
  validator.queryPagination(),
  validator.queryOrderBy(),
  validator.queryIncludeDeleted(),
  validator.queryIsActive(),
  validator.queryCreatedAtRange(),
  validate,
  adminController.getAdmins
);

// 建立管理員（同時建立 Auth 帳號）
// POST /api/admin/admins
router.post(
  '/',
  adminValidator.bodyEmail(),
  adminValidator.bodyPassword(),
  adminValidator.bodyName(),
  validate,
  adminController.createAdmin
);

// 為現有帳號賦予管理員角色
// POST /api/admin/admins/create-role
router.post(
  '/create-role',
  adminValidator.bodyUid(),
  adminValidator.bodyName(),
  validate,
  adminController.createAdminRole
);

// 取得單一管理員
// GET /api/admin/admins/:id
router.get('/:id', adminController.getAdminById);

// 更新管理員
// PUT /api/admin/admins/:id
router.put(
  '/:id',
  adminValidator.bodyName(),
  validate,
  adminController.updateAdmin
);

// 刪除管理員（軟刪除）
// DELETE /api/admin/admins/:id
router.delete('/:id', adminController.deleteAdmin);

// 切換管理員啟用/停用狀態
// PATCH /api/admin/admins/:id/toggle-status
router.patch('/:id/toggle-status', adminController.toggleAdminStatus);

// 恢復已軟刪除的管理員
// POST /api/admin/admins/:id/restore
router.post('/:id/restore', adminController.restoreAdmin);

module.exports = router;
