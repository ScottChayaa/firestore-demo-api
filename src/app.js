require('express-async-errors');
require("dotenv").config();

const express = require("express");
const listEndpoints = require('express-list-endpoints'); // 套件: 列出所有路由
const cors = require("cors");
const helmet = require("helmet");

// 匯入路由
const indexRouter = require("@/routes/index");
const authRouter = require("@/routes/auth");
const productsRouter = require("@/routes/products");
const memberRoutes = require("@/routes/member");
const adminRoutes = require("@/routes/admin");

// 匯入中間件
const httpLogger = require("@/middleware/httpLogger");
const { errorHandler, notFoundHandler } = require("@/middleware/errorHandler");

// 創建 Express 應用
const app = express();

// ========================================
// 中間件設定
// ========================================

// 安全性：設定安全相關的 HTTP Headers
app.use(helmet());

// CORS：允許跨域請求
const corsOptions = {
  origin: process.env.CORS_ORIGIN || "*",
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// 解析 JSON 請求體
app.use(express.json());

// 解析 URL-encoded 請求體
app.use(express.urlencoded({ extended: true }));

// HTTP 請求日誌（使用 pino-http）
app.use(httpLogger);

// ========================================
// 路由設定
// ========================================

// 公開 API 路由（無需驗證）
app.use("/", indexRouter);
app.use("/api/auth", authRouter);
app.use("/api/public/products", productsRouter);

// 私有 API 路由（需要 Firebase Auth 驗證）
app.use("/api/member", memberRoutes);  // 會員專屬端點（內建 authMember）
app.use("/api/admin", adminRoutes);    // 管理員專屬端點（內建 authAdmin）

// ========================================
// 錯誤處理
// ========================================

// 404 處理
app.use(notFoundHandler);

// 統一錯誤處理
app.use(errorHandler);

// 測試用: 列出目前所有路由結構
// console.log(listEndpoints(app));

// ========================================
// 匯出應用
// ========================================

module.exports = app;
