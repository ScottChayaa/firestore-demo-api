const express = require("express");
const router = express.Router();
const memberController = require("@/controllers/memberController");
const { validate, validator } = require("@/middleware/validator");
const { memberValidator } = require("@/middleware/memberValidator");

/**
 * 管理員會員管理路由
 * 基礎路徑：/api/admin/members
 */

// 取得所有會員列表（支援多條件篩選）
// GET /api/admin/members?minCreatedAt=2025-01-01
router.get(
  "/",
  [
    validator.queryPagination(),
    validator.queryOrderBy(),
    validator.queryCreatedAtRange(),
    validator.queryIncludeDeleted(),
    validator.queryIsActive(),
    validate,
  ],
  memberController.getMembers
);

// 建立會員（同時建立 Auth 帳號）
// POST /api/admin/members
router.post(
  "/",
  [
    memberValidator.bodyEmail(),
    memberValidator.bodyPassword(),
    memberValidator.bodyName(),
    memberValidator.bodyPhone(),
    validate,
  ],
  memberController.createMember
);

// 為現有帳號賦予會員角色
// POST /api/admin/members/create-role
router.post(
  "/create-role",
  [
    memberValidator.bodyUid(),
    memberValidator.bodyName(),
    memberValidator.bodyPhone(),
    validate,
  ],
  memberController.createMemberRole
);

// 取得單一會員
// GET /api/admin/members/:id
router.get("/:id", memberController.getMemberById);

// 更新會員基本資料
// PUT /api/admin/members/:id
router.put(
  "/:id",
  [memberValidator.bodyName(), memberValidator.bodyPhone(), validate],
  memberController.updateMember
);

// 更新會員密碼 (管理員直接更新)
// PATCH /api/admin/members/:id/password
router.patch(
  "/:id/password",
  [memberValidator.bodyPassword(), validate],
  memberController.updateMemberPassword
);

// 刪除會員（軟刪除）
// DELETE /api/admin/members/:id
router.delete("/:id", memberController.deleteMember);

// 切換會員啟用/停用狀態
// PATCH /api/admin/members/:id/toggle-status
router.patch("/:id/toggle-status", memberController.toggleMemberStatus);

// 恢復已軟刪除的會員
// POST /api/admin/members/:id/restore
router.post("/:id/restore", memberController.restoreMember);

// 產生會員重設密碼連結
// POST /api/admin/members/:id/generate-password-reset-link
router.post(
  "/:id/generate-password-reset-link",
  memberController.generatePasswordResetLink
);

module.exports = router;
