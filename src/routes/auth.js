const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const authController = require("@/controllers/authController");
const { validate, validator } = require("@/middleware/validator");
const { memberValidator } = require("@/middleware/memberValidator");
const { adminValidator } = require("@/middleware/adminValidator");

// 會員註冊
// POST /api/auth/register
router.post(
  "/register",
  [
    memberValidator.bodyEmail(),
    memberValidator.bodyPassword(),
    memberValidator.bodyName(),
    memberValidator.bodyPhone(),
    validate,
  ],
  authController.memberRegister
);

// 會員登入（Email/Password 直接取得含角色的 ID Token）
// POST /api/auth/member/signInWithPassword
router.post(
  "/member/signInWithPassword",
  [memberValidator.bodyEmail(), memberValidator.bodyPassword(), validate],
  authController.memberSignInWithPassword
);

// 管理員登入（Email/Password 直接取得含角色的 ID Token）
// POST /api/auth/admin/signInWithPassword
router.post(
  "/admin/signInWithPassword",
  [adminValidator.bodyEmail(), adminValidator.bodyPassword(), validate],
  authController.adminSignInWithPassword
);

// 會員忘記密碼（使用 Firebase REST API 發送郵件）
// POST /api/auth/forgot-password
router.post(
  "/forgot-password",
  [memberValidator.bodyEmail(), validate],
  authController.forgotPasswordWithEmail
);

module.exports = router;
