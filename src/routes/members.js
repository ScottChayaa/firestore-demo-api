const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const memberController = require('@/controllers/memberController');
const { validate, validatePagination, validateDateRange } = require('@/middleware/validator');

/**
 * 私有 API 路由 - 會員管理
 * 所有端點都需要 Firebase Auth 驗證
 *
 * 注意：會員註冊請使用 POST /api/auth/register
 * 這裡的路由主要用於管理現有會員資料
 */

// 列出會員列表（支援分頁、日期範圍篩選）
// GET /api/members?limit=20&cursor=xxx&startDate=2025-01-01&endDate=2025-01-31&order=desc
router.get(
  '/',
  validatePagination,
  validateDateRange,
  [
    query('order').default("desc").isIn(["desc", "asc"]),
    validate,
  ],
  memberController.getMembers
);

// 取得單一會員資料
// GET /api/members/:id
router.get('/:id', memberController.getMemberById);

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
  memberController.updateMember
);

// 刪除會員
// DELETE /api/members/:id
router.delete('/:id', memberController.deleteMember);

module.exports = router;
