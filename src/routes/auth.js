const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const authController = require('@/controllers/authController');
const { validate } = require('@/middleware/validator');

const bodyEmailValidator = () => body('email')
      .notEmpty().withMessage('Email 為必填欄位')
      .isEmail().withMessage('Email 格式不正確');

const bodyPasswordValidator = () => body('password')
      .notEmpty().withMessage('密碼為必填欄位')
      .isLength({ min: 6 }).withMessage('密碼至少需要 6 個字元');

// 會員註冊
// POST /api/auth/register
router.post(
  '/register',
  [
    bodyEmailValidator(),
    bodyPasswordValidator(),
    body('name')
      .notEmpty().withMessage('姓名為必填欄位'),
    body('phone')
      .notEmpty().withMessage('電話為必填欄位')
      .isMobilePhone('zh-TW').withMessage('請輸入正確的台灣手機號碼'),
    validate,
  ],
  authController.memberRegister
);

// 會員登入（Email/Password 直接取得含角色的 ID Token）
// POST /api/auth/member/signInWithPassword
router.post(
  '/member/signInWithPassword',
  [
    bodyEmailValidator(),
    bodyPasswordValidator(),
    validate,
  ],
  authController.memberSignInWithPassword
);

// 管理員登入（Email/Password 直接取得含角色的 ID Token）
// POST /api/auth/admin/signInWithPassword
router.post(
  '/admin/signInWithPassword',
  [
    bodyEmailValidator(),
    bodyPasswordValidator(),
    validate,
  ],
  authController.adminSignInWithPassword
);

// 會員 Custom Token 轉換（用於手機 App 等外部來源）
// POST /api/auth/member/signInWithCustomToken
router.post(
  '/member/signInWithCustomToken',
  [
    body('customToken')
      .notEmpty().withMessage('customToken 為必填欄位'),
    validate,
  ],
  authController.memberSignInWithCustomToken
);

// 管理員 Custom Token 轉換（用於手機 App 等外部來源）
// POST /api/auth/admin/signInWithCustomToken
router.post(
  '/admin/signInWithCustomToken',
  [
    body('customToken')
      .notEmpty().withMessage('customToken 為必填欄位'),
    validate,
  ],
  authController.adminSignInWithCustomToken
);

module.exports = router;
