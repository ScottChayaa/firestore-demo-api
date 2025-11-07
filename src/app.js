const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
const logger = require('./config/logger');
require('dotenv').config();

// 匯入路由
const authRouter = require('./routes/auth');
const productsRouter = require('./routes/products');
const membersRouter = require('./routes/members');
const ordersRouter = require('./routes/orders');

// 匯入中間件
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 匯入測試資料生成函數
const { seedAll } = require('./utils/seedData');
const { authenticate } = require('./middleware/auth');
const { asyncHandler } = require('./middleware/errorHandler');

// 創建 Express 應用
const app = express();

// ========================================
// 中間件設定
// ========================================

// 安全性：設定安全相關的 HTTP Headers
app.use(helmet());

// CORS：允許跨域請求
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// HTTP 請求日誌（使用 pino-http）
if (process.env.NODE_ENV !== 'test') {
  app.use(pinoHttp({
    logger,
    // 自動記錄每個請求的資訊
    autoLogging: true,

    // 根據狀態碼決定日誌等級
    customLogLevel: function (req, res, err) {
      if (res.statusCode >= 400 && res.statusCode < 500) {
        return 'warn';  // 4xx 客戶端錯誤 → WARN
      } else if (res.statusCode >= 500 || err) {
        return 'error'; // 5xx 伺服器錯誤 → ERROR
      } else if (res.statusCode >= 300 && res.statusCode < 400) {
        return 'info';  // 3xx 重導向 → INFO
      }
      return 'info';    // 2xx 成功 → INFO
    },

    // 將 res.err 對應到日誌的 err 欄位
    customAttributeKeys: {
      err: 'err'
    },

    // 自訂成功訊息（顯示請求方法和路徑）
    customSuccessMessage: function (req, res) {
      return `${req.method} ${req.url}`;
    },

    // 自訂錯誤訊息（顯示錯誤訊息）
    customErrorMessage: function (req, res, err) {
      return res.err?.message || err?.message || 'Request failed';
    },

    // 自訂序列化器
    serializers: {
      req: (req) => ({
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          'user-agent': req.headers['user-agent'],
          'content-type': req.headers['content-type']
        },
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
        // 如果有用戶資訊，一併記錄
        user: req.user ? {
          uid: req.user.uid,
          email: req.user.email
        } : undefined
      }),
      res: (res) => ({
        statusCode: res.statusCode,
        headers: {
          'content-type': res.getHeader('content-type')
        }
      }),
      // 錯誤序列化器（記錄完整堆疊追蹤）
      err: (err) => {
        if (!err) return undefined;
        return {
          type: err.name,
          message: err.message,
          stack: err.stack,
          statusCode: err.statusCode,
          details: err.details
        };
      }
    }
  }));
}

// 解析 JSON 請求體
app.use(express.json());

// 解析 URL-encoded 請求體
app.use(express.urlencoded({ extended: true }));

// ========================================
// 路由設定
// ========================================

// 健康檢查端點（公開）
app.get('/health', (req, res) => {
  res.json({
    message: 'Firestore Demo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 根路徑
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Firestore Demo API',
    version: '1.0.0',
  });
});

// 公開 API 路由（無需驗證）
app.use('/api/auth', authRouter);
app.use('/api/public/products', productsRouter);

// 私有 API 路由（需要 Firebase Auth 驗證）
app.use('/api/members', authenticate, membersRouter);
app.use('/api/orders', authenticate, ordersRouter);

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
