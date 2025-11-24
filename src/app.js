require('express-async-errors');
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

// 匯入路由
const indexRouter = require("@/routes/index");
const authRouter = require("@/routes/auth");
const productsRouter = require("@/routes/products");
const membersRouter = require("@/routes/members");
const ordersRouter = require("@/routes/orders");

// 匯入中間件
const httpLogger = require("@/middleware/httpLogger");
const { errorHandler, notFoundHandler } = require("@/middleware/errorHandler");
const { authenticate } = require("@/middleware/auth");

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
app.use("/api/members", authenticate, membersRouter);
app.use("/api/orders", authenticate, ordersRouter);

// ========================================
// 錯誤處理
// ========================================

// 404 處理
app.use(notFoundHandler);

// 統一錯誤處理
app.use(errorHandler);

// ========================================
// 匯出應用
// ========================================

module.exports = app;
