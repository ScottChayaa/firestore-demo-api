const express = require('express');
const router = express.Router();

/**
 * 公開 API 路由 - 根
 */

// 根路徑
router.get('/', (req, res) => {
  
  // 使用 pino-http 官方預設 req.log 紀錄
  req.log.trace('111');
  req.log.debug('222');
  req.log.info({
    message: '333',
    details: ['測試資料', 2, 3],
  });
  req.log.warn('444');
  req.log.error('555');
  req.log.fatal('666');

  res.json({
    message: 'Welcome to Firestore Demo API',
    version: process.env.IMAGE_VERSION || '(unknown)',
    environment: process.env.NODE_ENV || 'development',
  });
});

// 健康檢查端點（公開）
router.get('/health', (req, res) => {
  res.json({
    message: 'Firestore Demo API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
  });
});

module.exports = router;
