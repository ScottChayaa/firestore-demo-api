/**
 * Pino Logger 配置
 *
 * 功能：
 * - JSON 格式輸出（適用於 Google Cloud Logging）
 * - 支援 trace ID 追蹤
 * - 支援用戶上下文（userId, email）
 * - 支援效能指標
 * - 自動映射到 Google Cloud Logging severity levels
 */

const pino = require('pino');

/**
 * Google Cloud Logging Severity Levels 映射
 *
 * Pino levels -> Cloud Logging severity
 * trace (10)   -> DEBUG
 * debug (20)   -> DEBUG
 * info (30)    -> INFO
 * warn (40)    -> WARNING
 * error (50)   -> ERROR
 * fatal (60)   -> CRITICAL
 */
const SEVERITY_LOOKUP = {
  trace: 'DEBUG',
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARNING',
  error: 'ERROR',
  fatal: 'CRITICAL',
};

/**
 * 建立 Pino Logger 實例
 */
const logger = pino({
  // 日誌等級（從環境變數讀取，預設為 info）
  level: process.env.LOG_LEVEL || 'info',

  // 使用 'message' 作為訊息欄位（符合 Google Cloud Logging 標準）
  messageKey: 'message',

  // 格式化選項
  formatters: {
    // 映射日誌等級到 Google Cloud Logging severity
    level(label, number) {
      return {
        severity: SEVERITY_LOOKUP[label] || 'INFO',
        level: number,
      };
    },

    // 自訂日誌訊息格式
    log(object) {
      const { req, res, responseTime, ...rest } = object;

      // 基本日誌物件
      const logObject = { ...rest };

      // 如果有 HTTP 請求資訊，加入相關欄位
      if (req) {
        logObject.httpRequest = {
          requestMethod: req.method,
          requestUrl: req.url,
          userAgent: req.headers?.['user-agent'],
          remoteIp: req.headers?.['x-forwarded-for'] || req.socket?.remoteAddress,
          protocol: `HTTP/${req.httpVersion}`,
        };
      }

      // 如果有 HTTP 回應資訊，加入狀態碼
      if (res) {
        logObject.httpRequest = {
          ...logObject.httpRequest,
          status: res.statusCode,
        };
      }

      // 如果有回應時間，加入效能指標
      if (responseTime) {
        logObject.responseTime = responseTime;
      }

      return logObject;
    },
  },

  // 基礎欄位（每個日誌都會包含）
  base: {
    pid: process.pid,
    hostname: process.env.K_SERVICE || process.env.HOSTNAME || 'localhost',
  },

  // 時間戳記格式（ISO 8601）
  timestamp: () => `,"time":"${new Date().toISOString()}"`,
});

// logger.child 已經由 Pino 提供，無需覆寫
// 使用方式：logger.child({ traceId: 'abc', userId: '123' })

/**
 * 記錄效能指標的輔助函數
 *
 * @param {string} operation - 操作名稱
 * @param {number} duration - 持續時間（毫秒）
 * @param {Object} metadata - 額外的 metadata
 */
logger.performance = function(operation, duration, metadata = {}) {
  this.info({
    operation,
    duration,
    ...metadata,
  }, `Performance: ${operation} took ${duration}ms`);
};

module.exports = logger;
