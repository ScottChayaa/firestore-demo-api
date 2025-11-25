const express = require('express');
const router = express.Router();
const memberController = require('@/controllers/memberController');
const { authMember } = require('@/middleware/authMember');

/**
 * 會員個人資料路由
 * 基礎路徑：/api/member
 *
 * 所有端點都需要：
 * - authMember - 驗證會員身份
 * - 自動使用 req.user.uid 作為會員 ID
 */

// 取得自己的會員資料
// GET /api/member
router.get(
  '/',
  authMember,
  async (req, res, next) => {
    // 將 req.user.uid 注入到 req.params.id
    req.params.id = req.user.uid;
    next();
  },
  memberController.getMemberById
);

// 更新自己的會員資料
// PUT /api/member
router.put(
  '/',
  authMember,
  async (req, res, next) => {
    // 將 req.user.uid 注入到 req.params.id
    req.params.id = req.user.uid;
    next();
  },
  memberController.updateMember
);

module.exports = router;
