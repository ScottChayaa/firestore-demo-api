const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  getMemberById,
  updateMember,
  deleteMember,
  listMembers,
} = require('@/controllers/memberController');
const { validate } = require('@/middleware/validator');

/**
 * 私有 API 路由 - 會員管理
 * 所有端點都需要 Firebase Auth 驗證
 *
 * 注意：會員註冊請使用 POST /api/auth/register
 * 這裡的路由主要用於管理現有會員資料
 */

// 列出會員列表
// GET /api/members
router.get('/', listMembers);

// 取得單一會員資料
// GET /api/members/:id
router.get('/:id', getMemberById);

// 更新會員資料
// PUT /api/members/:id
router.put(
  '/:id',
  [
    body('name')
      .notEmpty().withMessage('姓名為必填欄位'),
    body('phone')
      .notEmpty().withMessage('電話為必填欄位')
      .isMobilePhone('zh-TW').withMessage('請輸入正確的台灣手機號碼'),
    validate,
  ],
  updateMember
);

// 刪除會員
// DELETE /api/members/:id
router.delete('/:id', deleteMember);

module.exports = router;
