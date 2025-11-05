const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
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

// 請求日誌
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
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
    success: true,
    message: 'Firestore Demo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

// 根路徑
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to Firestore Demo API',
    version: '1.0.0',
  });
});

// 公開 API 路由（無需驗證）
app.use('/api/auth', authRouter);
app.use('/api/public/products', productsRouter);

// 私有 API 路由（需要 Firebase Auth 驗證）
app.use('/api/members', membersRouter);
app.use('/api/orders', ordersRouter);

// 測試資料生成端點（需要驗證）
app.post('/api/seed', authenticate, asyncHandler(async (req, res) => {
  console.log('📝 收到測試資料生成請求...');

  const result = await seedAll();

  res.status(201).json({
    success: true,
    message: '測試資料生成成功',
    ...result,
  });
}));

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
