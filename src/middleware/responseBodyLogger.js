/**
 * Response Body Logger 中間件
 * 攔截 res.json() 和 res.send() 將 response body 儲存到 res.locals
 * 供 pino-http 的 customSuccessObject/customErrorObject 記錄
 *
 * 特點：
 * - 僅在開發環境啟用（預設）
 * - 支援 response body 大小限制
 * - 自動遮蔽敏感欄位
 * - 排除二進位內容（圖片、影片等）
 */

const MAX_BODY_LENGTH = parseInt(process.env.MAX_RESPONSE_BODY_LENGTH || '10000');

// 敏感欄位清單（會被遮蔽為 ***REDACTED***）
const SENSITIVE_FIELDS = [
  // 身份驗證
  'password',
  'passwd',
  'pwd',
  'token',
  'accessToken',
  'refreshToken',
  'apiKey',
  'api_key',
  'secret',
  'secretKey',

  // 個人資料
  'ssn',
  'socialSecurityNumber',
  'creditCard',
  'cardNumber',
  'cvv',
  'pin',

  // Firebase 相關
  'privateKey',
  'clientEmail',
  'serviceAccount',
];

// 二進位內容類型（不記錄這些類型的響應）
const BINARY_CONTENT_TYPES = [
  'image/',
  'video/',
  'audio/',
  'application/octet-stream',
  'application/pdf',
  'text/event-stream', // Server-Sent Events
];

/**
 * 遮蔽敏感資料
 * @param {any} body - 響應 body
 * @returns {any} 遮蔽後的 body
 */
function sanitizeBody(body) {
  if (!body || typeof body !== 'object') {
    return body;
  }

  // 深度複製避免修改原始物件
  const sanitized = JSON.parse(JSON.stringify(body));

  function recursiveSanitize(obj) {
    if (Array.isArray(obj)) {
      return obj.map(item => recursiveSanitize(item));
    }

    if (obj && typeof obj === 'object') {
      for (const key in obj) {
        // 檢查欄位名稱是否包含敏感關鍵字
        if (SENSITIVE_FIELDS.some(field =>
          key.toLowerCase().includes(field.toLowerCase())
        )) {
          obj[key] = '***REDACTED***';
        } else if (typeof obj[key] === 'object') {
          obj[key] = recursiveSanitize(obj[key]);
        }
      }
    }

    return obj;
  }

  return recursiveSanitize(sanitized);
}

/**
 * 截斷過大的 body
 * @param {any} body - 響應 body
 * @param {number} maxLength - 最大長度（bytes）
 * @returns {any} 截斷後的 body 或原始 body
 */
function truncateBody(body, maxLength) {
  const bodyStr = typeof body === 'string'
    ? body
    : JSON.stringify(body);

  if (bodyStr.length > maxLength) {
    return {
      _truncated: true,
      _originalLength: bodyStr.length,
      _content: bodyStr.substring(0, maxLength) + '... [truncated]',
    };
  }

  return body;
}

/**
 * 檢查是否應該記錄響應 body
 * @param {object} res - Express response 物件
 * @returns {boolean}
 */
function shouldLogResponseBody(res) {
  const contentType = res.getHeader('content-type') || '';

  // 排除二進位內容
  return !BINARY_CONTENT_TYPES.some(type => contentType.includes(type));
}

/**
 * Response Body Logger 中間件
 * @param {object} options - 配置選項
 * @param {boolean} options.enabled - 是否啟用（預設：開發環境啟用）
 * @param {number} options.maxBodyLength - 最大 body 長度（預設：10000）
 * @param {boolean} options.sanitize - 是否遮蔽敏感欄位（預設：true）
 * @param {boolean} options.onlyErrors - 僅記錄錯誤響應（預設：false）
 */
function responseBodyLogger(options = {}) {
  const {
    enabled = process.env.LOG_RESPONSE_BODY !== 'false' &&
              process.env.NODE_ENV !== 'production',
    maxBodyLength = MAX_BODY_LENGTH,
    sanitize = true,
    onlyErrors = false,
  } = options;

  // 如果禁用，返回空中間件
  if (!enabled) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
    // 儲存原始方法
    const originalJson = res.json.bind(res);
    const originalSend = res.send.bind(res);
    const originalEnd = res.end.bind(res);

    /**
     * 覆寫 res.json()
     */
    res.json = function (body) {
      // 檢查是否應該記錄（僅錯誤模式下檢查狀態碼）
      if (!onlyErrors || res.statusCode >= 400) {
        if (shouldLogResponseBody(res)) {
          let processedBody = body;

          // 遮蔽敏感資料
          if (sanitize) {
            processedBody = sanitizeBody(body);
          }

          // 截斷過大的 body
          processedBody = truncateBody(processedBody, maxBodyLength);

          // 儲存到 res.locals 供 pino-http 使用
          res.locals.responseBody = processedBody;
        }
      }

      // 呼叫原始方法
      return originalJson(body);
    };

    /**
     * 覆寫 res.send()
     */
    res.send = function (body) {
      if (!onlyErrors || res.statusCode >= 400) {
        if (shouldLogResponseBody(res)) {
          // 僅處理 JSON 資料
          if (typeof body === 'object' ||
              (typeof body === 'string' && body.trim().startsWith('{'))) {
            let processedBody = body;

            try {
              // 嘗試解析 JSON 字串
              if (typeof body === 'string') {
                processedBody = JSON.parse(body);
              }

              if (sanitize) {
                processedBody = sanitizeBody(processedBody);
              }

              processedBody = truncateBody(processedBody, maxBodyLength);
              res.locals.responseBody = processedBody;
            } catch (err) {
              // 非 JSON 資料，儲存原始內容（截斷）
              res.locals.responseBody = truncateBody(body, maxBodyLength);
            }
          } else {
            // 純文字或其他格式
            res.locals.responseBody = truncateBody(body, maxBodyLength);
          }
        }
      }

      return originalSend(body);
    };

    /**
     * 覆寫 res.end() - 處理直接使用 res.end() 的情況
     */
    res.end = function (chunk, encoding) {
      // 如果 res.locals.responseBody 還未設定且有 chunk
      if (!res.locals.responseBody && chunk) {
        if (!onlyErrors || res.statusCode >= 400) {
          if (shouldLogResponseBody(res)) {
            try {
              const body = chunk.toString(encoding || 'utf8');
              let processedBody = body;

              // 嘗試解析 JSON
              if (body.trim().startsWith('{') || body.trim().startsWith('[')) {
                try {
                  processedBody = JSON.parse(body);
                  if (sanitize) {
                    processedBody = sanitizeBody(processedBody);
                  }
                } catch (e) {
                  // 非 JSON，使用原始內容
                }
              }

              res.locals.responseBody = truncateBody(processedBody, maxBodyLength);
            } catch (err) {
              // 忽略錯誤，繼續
            }
          }
        }
      }

      return originalEnd(chunk, encoding);
    };

    next();
  };
}

module.exports = responseBodyLogger;
