const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { register, login } = require('../controllers/authController');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 公開 API 路由 - 認證
 * 這些端點不需要 Firebase Auth 驗證
 */

// 註冊
// POST /api/auth/register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Email 格式不正確'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('密碼至少需要 6 個字元'),
    body('name').notEmpty().withMessage('姓名為必填欄位'),
    body('phone').notEmpty().withMessage('電話為必填欄位'),
    validate,
  ],
  asyncHandler(register)
);

// 登入
// POST /api/auth/login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Email 格式不正確'),
    body('password').notEmpty().withMessage('密碼為必填欄位'),
    validate,
  ],
  asyncHandler(login)
);

module.exports = router;
