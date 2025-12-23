const express = require('express');

const router = express.Router();
const memberController = require('@/controllers/memberController');

/**
 * 會員個人資料路由
 * 基礎路徑：/api/member
 */

// 取得自己的會員資料
router.get(
  '/',
  async (req, res, next) => {
    // 將 req.user.uid 注入到 req.params.id
    req.params.id = req.user.uid;
    next();
  },
  memberController.getMemberById
);

// 更新自己的會員資料
router.put(
  '/',
  async (req, res, next) => {
    // 將 req.user.uid 注入到 req.params.id
    req.params.id = req.user.uid;
    next();
  },
  memberController.updateMember
);

module.exports = router;
