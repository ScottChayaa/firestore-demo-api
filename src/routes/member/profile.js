const express = require('express');
const { body, query } = require("express-validator");

const router = express.Router();
const memberController = require('@/controllers/memberController');

/**
 * 會員個人資料路由
 * 基礎路徑：/api/member
 */

// 取得自己的會員資料
// GET /api/member
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
// PUT /api/member
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
