const express = require('express');
const router = express.Router();

/**
 * 公開 API 路由 - 根
 */

// 根路徑
router.get("/", (req, res) => {
  res.json({
    message: "Welcome to Firestore Demo API",
    version: process.env.IMAGE_VERSION || "(unknown)",
    environment: process.env.NODE_ENV || "development"
  });
});

// 健康檢查端點（公開）
router.get("/health", (req, res) => {
  res.json({
    message: "Firestore Demo API is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});


module.exports = router;
