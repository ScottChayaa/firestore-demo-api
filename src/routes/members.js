const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createMember,
  getMemberById,
  updateMember,
  deleteMember,
  listMembers,
} = require('../controllers/memberController');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 私有 API 路由 - 會員管理
 * 所有端點都需要 Firebase Auth 驗證
 *
 * 注意：會員註冊請使用 POST /api/auth/register
 * 這裡的路由主要用於管理現有會員資料
 */

// 套用驗證中間件到所有路由
router.use(authenticate);

// 列出會員列表
// GET /api/members
router.get('/', asyncHandler(listMembers));

// 創建會員（已棄用 - 請使用 POST /api/auth/register）
// POST /api/members
// @deprecated 改用 POST /api/auth/register，會同時建立 Firebase Auth 用戶和 Firestore document
router.post(
  '/',
  [
    body('name').notEmpty().withMessage('姓名為必填欄位'),
    body('email').isEmail().withMessage('Email 格式不正確'),
    body('phone').notEmpty().withMessage('電話為必填欄位'),
    validate,
  ],
  asyncHandler(createMember)
);

// 取得單一會員資料
// GET /api/members/:id
router.get('/:id', asyncHandler(getMemberById));

// 更新會員資料
// PUT /api/members/:id
router.put(
  '/:id',
  [
    body('name').optional().notEmpty().withMessage('姓名不可為空'),
    body('email').optional().isEmail().withMessage('Email 格式不正確'),
    body('phone').optional().notEmpty().withMessage('電話不可為空'),
    validate,
  ],
  asyncHandler(updateMember)
);

// 刪除會員
// DELETE /api/members/:id
router.delete('/:id', asyncHandler(deleteMember));

module.exports = router;
